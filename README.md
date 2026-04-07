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
  - Optional: `?group=stations|active|weather|gps-ops|...`
  - Optional: `?limit=200` (useful for large groups like `active`)

## Run the frontend (Three.js)

Serve the `frontend/` folder (opening `index.html` directly can work, but a local server is more reliable):

```bash
python -m http.server 5173 --directory frontend
```

Then open `http://localhost:5173` and click **Refresh**.

Tip: **Shift + Refresh** forces a backend `?refresh=true` request.

## Live mode + satellite details

- The frontend polls the backend automatically (Live updates) so you usually don’t need to press **Refresh**.
- Tap/click a satellite dot to see its name, lat/lon, and altitude in the HUD.

## Real Earth map texture

Option A (recommended): put an equirectangular (2:1) Earth map image at `frontend/earthmap.jpg` (or `.png`) and reload the page.

Option B: click **Earth map…** in the UI and choose an image file (small files may be remembered by the browser).

### Optional layers

All layer images should be equirectangular (2:1) and aligned with the base map.

- Country boundaries overlay: add `frontend/boundaries.png` (transparent background recommended) or load via **Boundaries…**
- Height/bump map: add `frontend/height.png` (grayscale) or load via **Height…**
- Weather overlay: add `frontend/weather.png` (transparent background recommended) or load via **Weather…**
- Live weather overlay: set **Weather URL** to a (CORS-enabled) equirectangular image and enable **Live**
