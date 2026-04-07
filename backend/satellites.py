from __future__ import annotations

import time
from dataclasses import dataclass

import requests
from skyfield.api import EarthSatellite, load, wgs84

# CelesTrak URL for Space Stations (includes ISS). 
# Change 'stations' to 'active' for all satellites (warning: large payload)
CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'

@dataclass(frozen=True)
class _Tle:
    name: str
    line1: str
    line2: str


_TLE_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours
_tle_cache: dict[str, object] = {"fetched_at": 0.0, "tles": []}


def _fetch_tles() -> list[_Tle]:
    response = requests.get(
        CELESTRAK_URL,
        timeout=15,
        headers={"User-Agent": "satellite-tracker/1.0 (+local)"},
    )
    response.raise_for_status()

    lines = [line.strip() for line in response.text.splitlines() if line.strip()]
    tles: list[_Tle] = []

    # TLE data comes in blocks of 3 lines (Name, Line 1, Line 2)
    for i in range(0, len(lines), 3):
        if i + 2 >= len(lines):
            break
        name = lines[i]
        line1 = lines[i + 1]
        line2 = lines[i + 2]
        if not (line1.startswith("1 ") and line2.startswith("2 ")):
            continue
        tles.append(_Tle(name=name, line1=line1, line2=line2))

    return tles


def _get_cached_tles(force_refresh: bool = False) -> list[_Tle]:
    now = time.time()
    fetched_at = float(_tle_cache.get("fetched_at", 0.0))
    cached_tles = _tle_cache.get("tles", [])

    if (
        force_refresh
        or not isinstance(cached_tles, list)
        or (now - fetched_at) > _TLE_CACHE_TTL_SECONDS
        or len(cached_tles) == 0
    ):
        tles = _fetch_tles()
        _tle_cache["fetched_at"] = now
        _tle_cache["tles"] = tles
        return tles

    return cached_tles  # type: ignore[return-value]


def get_satellite_positions(force_refresh: bool = False) -> list[dict[str, object]]:
    """Fetches TLE data and computes current lat/lon for each satellite."""
    tles = _get_cached_tles(force_refresh=force_refresh)

    ts = load.timescale()
    t = ts.now()

    satellites: list[dict[str, object]] = []
    for tle in tles:
        try:
            sat = EarthSatellite(tle.line1, tle.line2, tle.name, ts)
            geocentric = sat.at(t)
            subpoint = wgs84.subpoint(geocentric)
            satellites.append(
                {
                    "name": tle.name,
                    "lat": subpoint.latitude.degrees,
                    "lon": subpoint.longitude.degrees,
                    "elevation_km": subpoint.elevation.km,
                }
            )
        except Exception:
            # Skip satellites that fail computation (e.g., decayed orbits)
            continue

    return satellites
