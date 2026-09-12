# Sales-tracking-system---AI-solution

## Run locally

```powershell
python server.py
```

In VS Code, press `Ctrl+Shift+B` and choose `Tipscart: Run Frontend + Backend` to start the same frontend and backend task.

## Storage

The backend exposes sales persistence at `GET /api/sales`, `POST /api/sales`, and `DELETE /api/sales?id=<id>`.

Local development defaults to SQLite:

```powershell
$env:STORAGE_BACKEND = "sqlite"
python server.py
```

For a simple deployment that stores data beside the app, use JSON:

```powershell
$env:STORAGE_BACKEND = "json"
$env:JSON_DATA_FILE = "data/sales.json"
python server.py
```

SQLite is the better local option for concurrent writes and querying. JSON is convenient for small deployments and portable file-based storage; it is not intended for multiple server instances or high write volume.

Open `http://localhost:8000`. Tipsy uses the browser microphone and sends recordings to the local `/api/transcribe` proxy, which keeps the Sarvam API key on the server. Keep `sarvam_api_key` in `.env` and never commit `.env`.

The microphone requires a secure context (`localhost` is allowed) and browser microphone permission.

## Authentication

The frontend starts with a demo sign-in/sign-up screen. Any non-empty credentials are accepted for presentation mode; they are not checked or stored. The backend still includes optional account endpoints for future protected deployments.

Authentication endpoints:

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

For production, use HTTPS, a persistent session store, and a managed database or private JSON volume. The built-in session map is intended for a single-process deployment.