import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from storage import create_storage, create_user_storage, clean_sale, clean_user, public_user, verify_password

ROOT = Path(__file__).resolve().parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else int(os.environ.get("PORT", "8000"))
MAX_AUDIO_BYTES = 15 * 1024 * 1024
storage = None
user_store = None
sessions = {}


def load_env():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def json_response(handler, status, payload, extra_headers=None):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    origin = handler.headers.get("Origin")
    handler.send_header("Access-Control-Allow-Origin", origin or "*")
    if origin:
        handler.send_header("Vary", "Origin")
    handler.send_header("Access-Control-Allow-Credentials", "true")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Content-Length", str(len(body)))
    for key, value in (extra_headers or {}).items():
        handler.send_header(key, value)
    handler.end_headers()
    handler.wfile.write(body)


def parse_multipart(body, content_type):
    header = (
        f"Content-Type: {content_type}\r\n"
        "MIME-Version: 1.0\r\n\r\n"
    ).encode("utf-8")
    message = BytesParser(policy=default).parsebytes(header + body)
    fields = {}
    file_part = None
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        filename = part.get_filename()
        if filename:
            file_part = {
                "filename": filename,
                "content_type": part.get_content_type(),
                "data": part.get_payload(decode=True) or b"",
            }
        elif name:
            fields[name] = part.get_content()
    return fields, file_part


def create_multipart(file_part, fields):
    boundary = "----Tipscart" + secrets.token_hex(12)
    chunks = []
    for name, value in fields.items():
        chunks.extend([
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
            str(value).encode("utf-8"),
            b"\r\n",
        ])
    chunks.extend([
        f"--{boundary}\r\n".encode(),
        (
            f'Content-Disposition: form-data; name="file"; '
            f'filename="{file_part["filename"]}"\r\n'
        ).encode(),
        f'Content-Type: {file_part["content_type"]}\r\n\r\n'.encode(),
        file_part["data"],
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ])
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    if length > 1024 * 1024:
        raise ValueError("Request body is too large.")
    raw = handler.rfile.read(length)
    return json.loads(raw.decode("utf-8") or "{}")


def session_user(handler):
    cookie_header = handler.headers.get("Cookie", "")
    cookies = dict(part.strip().split("=", 1) for part in cookie_header.split(";") if "=" in part)
    user_id = sessions.get(cookies.get("tipscart_session"))
    return user_store.find_by_email(user_id) if user_id else None


class TipscartHandler(BaseHTTPRequestHandler):
    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")

    def do_POST(self):
        if self.path == "/api/auth/demo-login":
            try:
                payload = read_json(self)
                email = str(payload.get("email", "")).strip()
                if not email:
                    json_response(self, 400, {"error": "Email is required."})
                    return
                json_response(self, 200, {"user": {"name": email, "email": email}, "demo": True})
            except (ValueError, json.JSONDecodeError) as error:
                json_response(self, 400, {"error": str(error)})
            return
        if self.path == "/api/auth/signup":
            try:
                user = clean_user(read_json(self))
                if user_store.find_by_email(user["email"]):
                    json_response(self, 409, {"error": "An account with this email already exists."})
                    return
                user_store.add_user(user)
                token = secrets.token_urlsafe(32)
                sessions[token] = user["email"]
                json_response(self, 201, {"user": public_user(user)}, {"Set-Cookie": f"tipscart_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800"})
            except (ValueError, json.JSONDecodeError) as error:
                json_response(self, 400, {"error": str(error)})
            except Exception as error:
                print(f"Auth error: {error}")
                json_response(self, 500, {"error": "Could not create the account."})
            return
        if self.path == "/api/auth/login":
            try:
                payload = read_json(self)
                email = str(payload.get("email", "")).strip().lower()
                user = user_store.find_by_email(email)
                if not user or not verify_password(user, payload.get("password", "")):
                    json_response(self, 401, {"error": "Email or password is incorrect."})
                    return
                token = secrets.token_urlsafe(32)
                sessions[token] = user["email"]
                json_response(self, 200, {"user": public_user(user)}, {"Set-Cookie": f"tipscart_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800"})
            except (ValueError, json.JSONDecodeError) as error:
                json_response(self, 400, {"error": str(error)})
            return
        if self.path == "/api/auth/logout":
            cookie_header = self.headers.get("Cookie", "")
            cookies = dict(part.strip().split("=", 1) for part in cookie_header.split(";") if "=" in part)
            sessions.pop(cookies.get("tipscart_session"), None)
            json_response(self, 200, {"ok": True}, {"Set-Cookie": "tipscart_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"})
            return
        if self.path == "/api/sales":
            try:
                sale = storage.add_sale(clean_sale(read_json(self)))
                json_response(self, 201, sale)
            except (ValueError, json.JSONDecodeError) as error:
                json_response(self, 400, {"error": str(error)})
            except Exception as error:
                print(f"Storage error: {error}")
                json_response(self, 500, {"error": "Could not save the sale."})
            return
        if self.path != "/api/transcribe":
            json_response(self, 404, {"error": "Not found"})
            return
        try:
            content_type = self.headers.get("Content-Type", "")
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_AUDIO_BYTES:
                json_response(self, 413, {"error": "Audio file is too large. Maximum size is 15 MB."})
                return
            if not content_type.lower().startswith("multipart/form-data"):
                json_response(self, 400, {"error": "Audio must be uploaded as multipart form data."})
                return
            fields, file_part = parse_multipart(self.rfile.read(length), content_type)
            if not file_part or not file_part["data"]:
                json_response(self, 400, {"error": "No audio file was received."})
                return
            api_key = os.environ.get("SARVAM_API_KEY") or os.environ.get("sarvam_api_key")
            if not api_key:
                json_response(self, 500, {"error": "SARVAM_API_KEY is not configured on the server."})
                return
            outbound, outbound_type = create_multipart(
                file_part,
                {
                    "model": fields.get("model", "saaras:v4"),
                    "mode": fields.get("mode", "transcribe"),
                },
            )
            request = urllib.request.Request(
                "https://api.sarvam.ai/speech-to-text",
                data=outbound,
                headers={
                    "api-subscription-key": api_key,
                    "Content-Type": outbound_type,
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                result = json.loads(response.read().decode("utf-8"))
            json_response(self, 200, {"transcript": result.get("transcript", "")})
        except urllib.error.HTTPError as error:
            try:
                detail = json.loads(error.read().decode("utf-8"))
                message = detail.get("error", {}).get("message") or detail.get("message") or "Sarvam transcription failed."
            except (ValueError, UnicodeDecodeError):
                message = "Sarvam transcription failed."
            json_response(self, error.code, {"error": message})
        except Exception as error:
            print(f"Transcription error: {error}")
            json_response(self, 500, {"error": "The transcription service is unavailable right now."})

    def do_OPTIONS(self):
        self.send_response(204)
        origin = self.headers.get("Origin")
        self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/auth/me":
            user = session_user(self)
            if not user:
                json_response(self, 401, {"error": "Not authenticated."})
                return
            json_response(self, 200, {"user": public_user(user)})
            return
        if self.path == "/api/sales":
            try:
                json_response(self, 200, {"sales": storage.list_sales()})
            except Exception as error:
                print(f"Storage error: {error}")
                json_response(self, 500, {"error": "Could not load sales."})
            return
        requested = unquote(urlparse(self.path).path)
        relative = "index.html" if requested == "/" else requested.lstrip("/")
        if relative == ".env" or relative.startswith(".env/"):
            json_response(self, 404, {"error": "Not found"})
            return
        file_path = (ROOT / relative).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            json_response(self, 403, {"error": "Forbidden"})
            return
        if not file_path.is_file():
            json_response(self, 404, {"error": "Not found"})
            return
        content_types = {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
        }
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_types.get(file_path.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/sales":
            json_response(self, 404, {"error": "Not found"})
            return
        sale_id = parsed.query.removeprefix("id=")
        if not sale_id:
            json_response(self, 400, {"error": "Sale id is required."})
            return
        try:
            if not storage.delete_sale(sale_id):
                json_response(self, 404, {"error": "Sale not found."})
                return
            json_response(self, 200, {"deleted": sale_id})
        except Exception as error:
            print(f"Storage error: {error}")
            json_response(self, 500, {"error": "Could not delete the sale."})


if __name__ == "__main__":
    load_env()
    storage = create_storage()
    user_store = create_user_storage()
    sessions = {}
    server = ThreadingHTTPServer(("127.0.0.1", PORT), TipscartHandler)
    print(f"Tipscart server running at http://localhost:{PORT}")
    server.serve_forever()
