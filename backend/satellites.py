from __future__ import annotations

import time
from dataclasses import dataclass

import requests
from skyfield.api import EarthSatellite, load, wgs84

_CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php"

# Common CelesTrak groups. "active" can be very large and slower to compute.
_KNOWN_GROUPS: set[str] = {
    "stations",
    "active",
    "visual",
    "weather",
    "noaa",
    "goes",
    "gps-ops",
    "galileo",
    "iridium",
    "geo",
}

@dataclass(frozen=True)
class _Tle:
    name: str
    line1: str
    line2: str


_TLE_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours
_POSITION_CACHE_TTL_SECONDS = 2.0  # avoid recomputing huge groups too often

_tle_cache_by_group: dict[str, dict[str, object]] = {}
_pos_cache_by_group: dict[str, dict[str, object]] = {}


def _normalize_group(group: str | None) -> str:
    g = (group or "").strip().lower()
    if not g:
        return "stations"
    if g in _KNOWN_GROUPS:
        return g
    # Allow any group string, but keep it simple/safe.
    return g


def _celestrak_url_for_group(group: str) -> str:
    return f"{_CELESTRAK_BASE_URL}?GROUP={group}&FORMAT=tle"


def _fetch_tles(group: str) -> list[_Tle]:
    response = requests.get(
        _celestrak_url_for_group(group),
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


def _get_cached_tles(group: str, force_refresh: bool = False) -> list[_Tle]:
    now = time.time()
    cache = _tle_cache_by_group.setdefault(group, {"fetched_at": 0.0, "tles": []})
    fetched_at = float(cache.get("fetched_at", 0.0))
    cached_tles = cache.get("tles", [])

    if (
        force_refresh
        or not isinstance(cached_tles, list)
        or (now - fetched_at) > _TLE_CACHE_TTL_SECONDS
        or len(cached_tles) == 0
    ):
        tles = _fetch_tles(group)
        cache["fetched_at"] = now
        cache["tles"] = tles
        return tles

    return cached_tles  # type: ignore[return-value]


def _parse_norad_id(line1: str) -> int | None:
    # TLE line 1: columns 3-7 are the satellite catalog number.
    if not isinstance(line1, str) or len(line1) < 7:
        return None
    raw = line1[2:7].strip()
    try:
        return int(raw)
    except ValueError:
        return None


def get_satellite_positions(
    *,
    group: str = "stations",
    force_refresh: bool = False,
    limit: int | None = None,
) -> list[dict[str, object]]:
    """Fetches TLE data and computes current lat/lon for each satellite."""
    group = _normalize_group(group)
    tles = _get_cached_tles(group=group, force_refresh=force_refresh)

    if isinstance(limit, int) and limit > 0:
        tles = tles[:limit]

    now = time.time()
    pos_cache = _pos_cache_by_group.get(group)
    if (
        not force_refresh
        and pos_cache
        and (now - float(pos_cache.get("computed_at", 0.0))) <= _POSITION_CACHE_TTL_SECONDS
        and isinstance(pos_cache.get("positions"), list)
        and int(pos_cache.get("tle_count", -1)) == len(tles)
    ):
        return pos_cache["positions"]  # type: ignore[return-value]

    ts = load.timescale()
    t = ts.now()

    satellites: list[dict[str, object]] = []
    for tle in tles:
        try:
            sat = EarthSatellite(tle.line1, tle.line2, tle.name, ts)
            geocentric = sat.at(t)
            subpoint = wgs84.subpoint(geocentric)
            norad_id = _parse_norad_id(tle.line1)
            satellites.append(
                {
                    "name": tle.name,
                    "norad_id": norad_id,
                    "lat": subpoint.latitude.degrees,
                    "lon": subpoint.longitude.degrees,
                    "elevation_km": subpoint.elevation.km,
                }
            )
        except Exception:
            # Skip satellites that fail computation (e.g., decayed orbits)
            continue

    _pos_cache_by_group[group] = {
        "computed_at": now,
        "tle_count": len(tles),
        "positions": satellites,
    }
    return satellites
