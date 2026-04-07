from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from backend.satellites import get_satellite_positions
import requests

app = FastAPI(title="Satellite Tracking API")

# Allow CORS so the frontend can communicate with the backend locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/satellites")
def fetch_satellites(
    refresh: bool = Query(False, description="Force-refresh TLE cache from CelesTrak"),
    group: str = Query(
        "stations",
        description='CelesTrak group (e.g. "stations", "active", "weather", "gps-ops")',
    ),
    limit: int | None = Query(
        None,
        gt=0,
        description="Optional max satellites returned (useful for very large groups).",
    ),
):
    """API endpoint to get real-time satellite positions."""
    try:
        positions = get_satellite_positions(group=group, force_refresh=refresh, limit=limit)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch TLE data: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute satellite positions: {exc}") from exc

    return {"status": "success", "count": len(positions), "data": positions}


@app.get("/health")
def health():
    return {"status": "ok"}
