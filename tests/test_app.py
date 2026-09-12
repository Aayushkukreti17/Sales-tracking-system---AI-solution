import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path

import server as app_server
from storage import JsonStorage, SqliteStorage, clean_sale

ROOT = Path(__file__).resolve().parents[1]


class StorageTests(unittest.TestCase):
    def make_sale(self, product="Test product"):
        return clean_sale({"product": product, "price": 100, "cost": 60, "quantity": 2})

    def test_sqlite_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = SqliteStorage(Path(directory) / "sales.sqlite3")
            sale = storage.add_sale(self.make_sale())
            self.assertEqual(storage.list_sales()[0]["id"], sale["id"])
            self.assertTrue(storage.delete_sale(sale["id"]))
            self.assertEqual(storage.list_sales(), [])

    def test_json_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = JsonStorage(Path(directory) / "sales.json")
            sale = storage.add_sale(self.make_sale())
            self.assertEqual(storage.list_sales()[0]["product"], "Test product")
            self.assertTrue(storage.delete_sale(sale["id"]))
            self.assertEqual(storage.list_sales(), [])

    def test_sale_validation(self):
        with self.assertRaises(ValueError):
            clean_sale({"product": "", "price": 1, "cost": 1, "quantity": 1})
        with self.assertRaises(ValueError):
            clean_sale({"product": "Bad", "price": -1, "cost": 1, "quantity": 1})


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        app_server.storage = SqliteStorage(Path(cls.temp_dir.name) / "api.sqlite3")
        app_server.user_store = app_server.storage
        app_server.sessions.clear()
        cls.httpd = app_server.ThreadingHTTPServer(("127.0.0.1", 0), app_server.TipscartHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.temp_dir.cleanup()

    def request(self, path, method="GET", payload=None, cookie=None):
        body = None
        headers = {}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if cookie:
            headers["Cookie"] = cookie
        request = urllib.request.Request(self.base_url + path, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read().decode("utf-8")), response.headers
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8")), error.headers

    def test_sales_crud(self):
        status, sale, _ = self.request("/api/sales", "POST", {"product": "API test", "price": 50, "cost": 20, "quantity": 3})
        self.assertEqual(status, 201)
        status, records, _ = self.request("/api/sales")
        self.assertEqual(status, 200)
        self.assertTrue(any(record["id"] == sale["id"] for record in records["sales"]))
        status, deleted, _ = self.request("/api/sales?id=" + sale["id"], "DELETE")
        self.assertEqual(status, 200)
        self.assertEqual(deleted["deleted"], sale["id"])

    def test_invalid_sale_and_transcription_validation(self):
        status, _, _ = self.request("/api/sales", "POST", {"product": "", "price": 50, "cost": 20, "quantity": 1})
        self.assertEqual(status, 400)
        status, body, _ = self.request("/api/transcribe", "POST", {})
        self.assertEqual(status, 400)
        self.assertIn("multipart", body["error"])

    def test_auth_registration_login_session_and_logout(self):
        email = "auth-test@example.com"
        payload = {"name": "Auth Tester", "email": email, "company": "Tipscart QA", "password": "correct-horse-123"}
        status, created, headers = self.request("/api/auth/signup", "POST", payload)
        self.assertEqual(status, 201)
        self.assertEqual(created["user"]["email"], email)
        cookie = headers["Set-Cookie"].split(";", 1)[0]
        status, current, _ = self.request("/api/auth/me", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(current["user"]["name"], "Auth Tester")
        status, _, _ = self.request("/api/auth/signup", "POST", payload)
        self.assertEqual(status, 409)
        status, _, _ = self.request("/api/auth/login", "POST", {"email": email, "password": "wrong-password"})
        self.assertEqual(status, 401)
        status, logged_in, login_headers = self.request("/api/auth/login", "POST", {"email": email, "password": payload["password"]})
        self.assertEqual(status, 200)
        self.assertEqual(logged_in["user"]["company"], "Tipscart QA")
        status, logged_out, _ = self.request("/api/auth/logout", "POST", cookie=login_headers["Set-Cookie"].split(";", 1)[0])
        self.assertEqual(status, 200)
        self.assertTrue(logged_out["ok"])

    def test_options_and_secret_protection(self):
        request = urllib.request.Request(self.base_url + "/api/transcribe", method="OPTIONS")
        with urllib.request.urlopen(request) as response:
            self.assertEqual(response.status, 204)
            self.assertIn("POST", response.headers["Access-Control-Allow-Methods"])
        request = urllib.request.Request(self.base_url + "/.env")
        with self.assertRaises(urllib.error.HTTPError) as context:
            urllib.request.urlopen(request)
        self.assertEqual(context.exception.code, 404)

    def test_static_assets(self):
        for asset in ("/index.html", "/app.js", "/style.css", "/data.js"):
            request = urllib.request.Request(self.base_url + asset)
            with urllib.request.urlopen(request) as response:
                self.assertEqual(response.status, 200)
                self.assertGreater(int(response.headers["Content-Length"]), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
