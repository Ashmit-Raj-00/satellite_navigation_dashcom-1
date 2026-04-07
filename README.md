# Satellite Tracker

## Run the backend (FastAPI)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Endpoints:
- `GET /health`
- `GET /satellites` (add `?refresh=true` to force-refresh the TLE cache)

## Run the frontend (Three.js)

Serve the `frontend/` folder (opening `index.html` directly can work, but a local server is more reliable):

```bash
python -m http.server 5173 --directory frontend
```

Then open `http://localhost:5173` and click **Refresh**.

Tip: **Shift + Refresh** forces a backend `?refresh=true` request.

