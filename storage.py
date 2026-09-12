import json
import hashlib
import os
import secrets
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def clean_sale(payload):
    if not isinstance(payload, dict):
        raise ValueError("Sale must be a JSON object.")
    product = str(payload.get("product", "")).strip()
    if not product:
        raise ValueError("Product is required.")
    try:
        price = float(payload.get("price"))
        cost = float(payload.get("cost"))
        quantity = int(payload.get("quantity"))
    except (TypeError, ValueError):
        raise ValueError("Price, cost, and quantity must be numbers.")
    if price < 0 or cost < 0 or quantity < 1:
        raise ValueError("Price and cost cannot be negative, and quantity must be at least 1.")
    return {
        "id": str(payload.get("id") or uuid.uuid4()),
        "product": product,
        "price": price,
        "cost": cost,
        "quantity": quantity,
        "created_at": str(payload.get("created_at") or utc_now()),
    }


def clean_user(payload):
    if not isinstance(payload, dict):
        raise ValueError("Registration must be a JSON object.")
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    company = str(payload.get("company", "")).strip()
    if len(name) < 2:
        raise ValueError("Full name must be at least 2 characters.")
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise ValueError("Enter a valid email address.")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not company:
        raise ValueError("Company name is required.")
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 210000).hex()
    return {"id": str(uuid.uuid4()), "name": name, "email": email, "company": company, "salt": salt.hex(), "password_hash": password_hash, "created_at": utc_now()}


def public_user(user):
    return {key: user[key] for key in ("id", "name", "email", "company", "created_at")}


def verify_password(user, password):
    candidate = hashlib.pbkdf2_hmac("sha256", str(password).encode(), bytes.fromhex(user["salt"]), 210000).hex()
    return secrets.compare_digest(candidate, user["password_hash"])


class JsonStorage:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write([])

    def _read(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _write(self, records):
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(json.dumps(records, indent=2), encoding="utf-8")
        temporary.replace(self.path)

    def list_sales(self):
        with self.lock:
            return self._read()

    def add_sale(self, sale):
        with self.lock:
            records = self._read()
            records.append(sale)
            self._write(records)
            return sale

    def delete_sale(self, sale_id):
        with self.lock:
            records = self._read()
            filtered = [record for record in records if str(record.get("id")) != str(sale_id)]
            changed = len(filtered) != len(records)
            if changed:
                self._write(filtered)
            return changed


class JsonUserStorage:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write([])

    def _read(self):
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _write(self, records):
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(json.dumps(records, indent=2), encoding="utf-8")
        temporary.replace(self.path)

    def find_by_email(self, email):
        with self.lock:
            return next((user for user in self._read() if user["email"] == email.lower()), None)

    def add_user(self, user):
        with self.lock:
            records = self._read()
            records.append(user)
            self._write(records)
            return user


class SqliteStorage:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = self._connection()
        try:
            connection.execute(
                """CREATE TABLE IF NOT EXISTS sales (
                    id TEXT PRIMARY KEY,
                    product TEXT NOT NULL,
                    price REAL NOT NULL,
                    cost REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                )"""
            )
            connection.execute(
                """CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
                    company TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )"""
            )
            connection.commit()
        finally:
            connection.close()

    def _connection(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def list_sales(self):
        with self.lock:
            connection = self._connection()
            try:
                rows = connection.execute("SELECT id, product, price, cost, quantity, created_at FROM sales ORDER BY created_at DESC").fetchall()
                return [dict(row) for row in rows]
            finally:
                connection.close()

    def add_sale(self, sale):
        with self.lock:
            connection = self._connection()
            try:
                connection.execute(
                    "INSERT INTO sales (id, product, price, cost, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (sale["id"], sale["product"], sale["price"], sale["cost"], sale["quantity"], sale["created_at"]),
                )
                connection.commit()
                return sale
            finally:
                connection.close()

    def delete_sale(self, sale_id):
        with self.lock:
            connection = self._connection()
            try:
                cursor = connection.execute("DELETE FROM sales WHERE id = ?", (str(sale_id),))
                connection.commit()
                return cursor.rowcount > 0
            finally:
                connection.close()

    def find_by_email(self, email):
        with self.lock:
            connection = self._connection()
            try:
                row = connection.execute("SELECT id, name, email, company, salt, password_hash, created_at FROM users WHERE email = ?", (email.lower(),)).fetchone()
                return dict(row) if row else None
            finally:
                connection.close()

    def add_user(self, user):
        with self.lock:
            connection = self._connection()
            try:
                connection.execute("INSERT INTO users (id, name, email, company, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", tuple(user[key] for key in ("id", "name", "email", "company", "salt", "password_hash", "created_at")))
                connection.commit()
                return user
            finally:
                connection.close()


def create_storage():
    backend = os.environ.get("STORAGE_BACKEND", "sqlite").lower()
    if backend == "json":
        return JsonStorage(os.environ.get("JSON_DATA_FILE", DATA_DIR / "sales.json"))
    if backend != "sqlite":
        raise RuntimeError("STORAGE_BACKEND must be either 'sqlite' or 'json'.")
    return SqliteStorage(os.environ.get("SQLITE_DB_FILE", DATA_DIR / "tipscart.sqlite3"))


def create_user_storage():
    backend = os.environ.get("STORAGE_BACKEND", "sqlite").lower()
    if backend == "json":
        return JsonUserStorage(os.environ.get("JSON_USERS_FILE", DATA_DIR / "users.json"))
    if backend != "sqlite":
        raise RuntimeError("STORAGE_BACKEND must be either 'sqlite' or 'json'.")
    return SqliteStorage(os.environ.get("SQLITE_DB_FILE", DATA_DIR / "tipscart.sqlite3"))
