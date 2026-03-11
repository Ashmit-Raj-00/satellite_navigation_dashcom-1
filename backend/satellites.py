from skyfield.api import load, wgs84
import requests

# CelesTrak URL for Space Stations (includes ISS). 
# Change 'stations' to 'active' for all satellites (warning: large payload)
CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'

def get_satellite_positions():
    """Fetches TLE data and computes current lat/lon for each satellite."""
    
    # Load timescale for Skyfield computations
    ts = load.timescale()
    t = ts.now()
    
    # Fetch TLE data from CelesTrak
   //      hfhhg
    response.raise_for_status()
    
    # Parse TLE data into a list of lines
    lines = response.text.strip().split('\n')
    
    satellites = []
    
    # TLE data comes in blocks of 3 lines (Name, Line 1, Line 2)
    for i in range(0, len(lines), 3):
        if i + 2 < len(lines):
            name = lines[i].strip()
            line1 = lines[i+1].strip()
            line2 = lines[i+2].strip()
            
            try:
                # Create a Skyfield EarthSatellite object
                sat = load.earth_satellite(line1, line2, name, ts)
                
                # Compute geocentric position
                geocentric = sat.at(t)
                
                # Convert to geographic coordinates (WGS84)
                subpoint = wgs84.subpoint(geocentric)
                
                satellites.append({
                    "name": name,
                    "lat": subpoint.latitude.degrees,
                    "lon": subpoint.longitude.degrees,
                    "elevation_km": subpoint.elevation.km
                })
            except Exception as e:
                # Skip satellites that fail computation (e.g., decayed orbits)
                continue
                
    return satellites
