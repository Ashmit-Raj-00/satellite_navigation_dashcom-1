const container = document.getElementById('canvas-container');
const apiUrlInput = document.getElementById('api-url');
const refreshBtn = document.getElementById('btn-refresh');
const resetBtn = document.getElementById('btn-reset');
const liveToggle = document.getElementById('toggle-live');
const liveIntervalSelect = document.getElementById('live-interval');
const earthTextureFile = document.getElementById('earth-texture-file');
const earthUploadBtn = document.getElementById('btn-earth-upload');
const earthResetBtn = document.getElementById('btn-earth-reset');
const boundariesTextureFile = document.getElementById('earth-boundaries-file');
const boundariesUploadBtn = document.getElementById('btn-boundaries-upload');
const boundariesClearBtn = document.getElementById('btn-boundaries-clear');
const boundariesOpacityInput = document.getElementById('boundaries-opacity');
const weatherTextureFile = document.getElementById('earth-weather-file');
const weatherUploadBtn = document.getElementById('btn-weather-upload');
const weatherClearBtn = document.getElementById('btn-weather-clear');
const weatherOpacityInput = document.getElementById('weather-opacity');
const weatherUrlInput = document.getElementById('weather-url');
const weatherLiveToggle = document.getElementById('toggle-weather-live');
const weatherIntervalSelect = document.getElementById('weather-interval');
const heightTextureFile = document.getElementById('earth-height-file');
const heightUploadBtn = document.getElementById('btn-height-upload');
const heightClearBtn = document.getElementById('btn-height-clear');
const heightStrengthInput = document.getElementById('height-strength');
const autorotateToggle = document.getElementById('toggle-autorotate');
const statusEl = document.getElementById('status');
const satCountEl = document.getElementById('sat-count');
const lastUpdatedEl = document.getElementById('last-updated');
const toastEl = document.getElementById('toast');
const satInfoEl = document.getElementById('sat-info');
const satNameEl = document.getElementById('sat-name');
const satLatEl = document.getElementById('sat-lat');
const satLonEl = document.getElementById('sat-lon');
const satAltEl = document.getElementById('sat-alt');
const clearSelectionBtn = document.getElementById('btn-clear-selection');

const DEFAULT_API_URL = 'http://localhost:8000/satellites';
const LS_API_URL_KEY = 'satellite-tracker:api-url';
const LS_AUTOROTATE_KEY = 'satellite-tracker:autorotate';
const LS_LIVE_KEY = 'satellite-tracker:live';
const LS_LIVE_INTERVAL_KEY = 'satellite-tracker:live-interval-ms';
const LS_EARTH_TEXTURE_DATAURL_KEY = 'satellite-tracker:earth-texture-dataurl';
const LS_BOUNDARIES_OPACITY_KEY = 'satellite-tracker:boundaries-opacity';
const LS_WEATHER_OPACITY_KEY = 'satellite-tracker:weather-opacity';
const LS_HEIGHT_STRENGTH_KEY = 'satellite-tracker:height-strength';
const LS_WEATHER_URL_KEY = 'satellite-tracker:weather-url';
const LS_WEATHER_LIVE_KEY = 'satellite-tracker:weather-live';
const LS_WEATHER_INTERVAL_KEY = 'satellite-tracker:weather-interval-ms';

function setStatus(text) {
    statusEl.textContent = text;
}

function formatTime(ts) {
    if (!Number.isFinite(ts)) return '—';
    return new Date(ts).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

let toastTimer = null;
function toast(message, { kind = 'info', ms = 3500 } = {}) {
    if (!message) return;
    toastEl.textContent = message;
    toastEl.classList.toggle('toast--error', kind === 'error');
    toastEl.classList.add('toast--show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('toast--show'), ms);
}

function resolveUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    try {
        // Allows relative URLs when hosted behind a dev server.
        return new URL(trimmed, window.location.href).toString();
    } catch {
        return null;
    }
}

function loadInitialUiState() {
    const savedUrl = localStorage.getItem(LS_API_URL_KEY);
    apiUrlInput.value = savedUrl || DEFAULT_API_URL;

    const savedAutorotate = localStorage.getItem(LS_AUTOROTATE_KEY);
    autorotateToggle.checked = savedAutorotate == null ? true : savedAutorotate === 'true';

    const savedLive = localStorage.getItem(LS_LIVE_KEY);
    liveToggle.checked = savedLive == null ? true : savedLive === 'true';

    const savedInterval = Number(localStorage.getItem(LS_LIVE_INTERVAL_KEY));
    if (Number.isFinite(savedInterval) && savedInterval > 0) {
        liveIntervalSelect.value = String(savedInterval);
    }

    const savedBoundariesOpacity = Number(localStorage.getItem(LS_BOUNDARIES_OPACITY_KEY));
    if (Number.isFinite(savedBoundariesOpacity)) boundariesOpacityInput.value = String(savedBoundariesOpacity);

    const savedWeatherOpacity = Number(localStorage.getItem(LS_WEATHER_OPACITY_KEY));
    if (Number.isFinite(savedWeatherOpacity)) weatherOpacityInput.value = String(savedWeatherOpacity);

    const savedHeightStrength = Number(localStorage.getItem(LS_HEIGHT_STRENGTH_KEY));
    if (Number.isFinite(savedHeightStrength)) heightStrengthInput.value = String(savedHeightStrength);

    const savedWeatherUrl = localStorage.getItem(LS_WEATHER_URL_KEY);
    if (savedWeatherUrl != null) weatherUrlInput.value = savedWeatherUrl;

    const savedWeatherLive = localStorage.getItem(LS_WEATHER_LIVE_KEY);
    weatherLiveToggle.checked = savedWeatherLive === 'true';

    const savedWeatherInterval = Number(localStorage.getItem(LS_WEATHER_INTERVAL_KEY));
    if (Number.isFinite(savedWeatherInterval) && savedWeatherInterval > 0) {
        weatherIntervalSelect.value = String(savedWeatherInterval);
    }
}

function persistUiState() {
    localStorage.setItem(LS_API_URL_KEY, apiUrlInput.value.trim());
    localStorage.setItem(LS_AUTOROTATE_KEY, String(autorotateToggle.checked));
    localStorage.setItem(LS_LIVE_KEY, String(liveToggle.checked));
    localStorage.setItem(LS_LIVE_INTERVAL_KEY, String(Number(liveIntervalSelect.value) || 2000));
    localStorage.setItem(LS_BOUNDARIES_OPACITY_KEY, String(Number(boundariesOpacityInput.value) || 0.85));
    localStorage.setItem(LS_WEATHER_OPACITY_KEY, String(Number(weatherOpacityInput.value) || 0.65));
    localStorage.setItem(LS_HEIGHT_STRENGTH_KEY, String(Number(heightStrengthInput.value) || 0.25));
    localStorage.setItem(LS_WEATHER_URL_KEY, weatherUrlInput.value.trim());
    localStorage.setItem(LS_WEATHER_LIVE_KEY, String(weatherLiveToggle.checked));
    localStorage.setItem(LS_WEATHER_INTERVAL_KEY, String(Number(weatherIntervalSelect.value) || 10000));
}

// --- THREE.JS SCENE ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
container.appendChild(renderer.domElement);

function setRendererColorSpace() {
    // three.js r128 uses outputEncoding; newer releases use outputColorSpace.
    if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
        renderer.outputEncoding = THREE.sRGBEncoding;
        return;
    }
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
}

function setTextureColorSpace(tex) {
    if (!tex) return;
    if ('encoding' in tex && THREE.sRGBEncoding) {
        tex.encoding = THREE.sRGBEncoding;
        return;
    }
    if ('colorSpace' in tex && THREE.SRGBColorSpace) {
        tex.colorSpace = THREE.SRGBColorSpace;
    }
}

setRendererColorSpace();

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 50;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
keyLight.position.set(5, 3, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x7c5cff, 0.25);
rimLight.position.set(-6, -2, -6);
scene.add(rimLight);

function createCircleSpriteTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
}

function createProceduralEarthTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Ocean base
    const ocean = ctx.createLinearGradient(0, 0, 0, size);
    ocean.addColorStop(0, '#06204e');
    ocean.addColorStop(1, '#041131');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, size, size);

    // Subtle noise
    for (let i = 0; i < 22000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const a = Math.random() * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
    }

    // Land blobs
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 900; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 12 + Math.random() * 70;
        const hue = 105 + Math.random() * 25;
        const sat = 30 + Math.random() * 35;
        const light = 18 + Math.random() * 22;
        const alpha = 0.10 + Math.random() * 0.22;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Clouds
    for (let i = 0; i < 550; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 18 + Math.random() * 60;
        const alpha = 0.03 + Math.random() * 0.09;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    setTextureColorSpace(tex);
    return tex;
}

function buildStars({ count = 1600, radius = 260 } = {}) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = radius * (0.85 + Math.random() * 0.15);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.1,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
}

scene.add(buildStars());

// Earth + satellites live in a group so they rotate together.
const earthRadius = 5;
const earthGroup = new THREE.Group();
scene.add(earthGroup);

const earthGeo = new THREE.SphereGeometry(earthRadius, 96, 96);
const earthTex = createProceduralEarthTexture();
const earthMat = new THREE.MeshStandardMaterial({
    map: earthTex,
    roughness: 1.0,
    metalness: 0.0,
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earthMesh);

// Overlays (boundaries, weather) are separate slightly-larger spheres.
const boundariesMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});
const boundariesMesh = new THREE.Mesh(
    new THREE.SphereGeometry(earthRadius * 1.002, 96, 96),
    boundariesMat
);
boundariesMesh.visible = false;
earthGroup.add(boundariesMesh);

const weatherMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});
const weatherMesh = new THREE.Mesh(
    new THREE.SphereGeometry(earthRadius * 1.004, 96, 96),
    weatherMat
);
weatherMesh.visible = false;
earthGroup.add(weatherMesh);

function applyEarthTexture(tex) {
    if (!tex) return;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    setTextureColorSpace(tex);
    tex.needsUpdate = true;
    earthMat.map = tex;
    earthMat.needsUpdate = true;
}

function resetEarthTextureToProcedural() {
    const next = createProceduralEarthTexture();
    applyEarthTexture(next);
    localStorage.removeItem(LS_EARTH_TEXTURE_DATAURL_KEY);
    toast('Switched to procedural Earth texture.');
}

function loadTextureFromUrl(url) {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (tex) => resolve(tex),
            undefined,
            (err) => reject(err || new Error('Failed to load image'))
        );
    });
}

function replaceMaterialTexture(material, key, next) {
    const prev = material?.[key];
    if (prev && prev !== next && typeof prev.dispose === 'function') prev.dispose();
    material[key] = next || null;
    material.needsUpdate = true;
}

function applyOverlayTexture(material, mesh, tex) {
    if (!material || !mesh) return;
    if (!tex) {
        replaceMaterialTexture(material, 'map', null);
        mesh.visible = false;
        return;
    }
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    setTextureColorSpace(tex);
    tex.needsUpdate = true;
    replaceMaterialTexture(material, 'map', tex);
    mesh.visible = true;
}

async function tryLoadBundledEarthMap() {
    const candidates = ['earthmap.jpg', 'earthmap.png', 'earthmap.jpeg', 'earthmap.webp'];
    for (const file of candidates) {
        try {
            const tex = await loadTextureFromUrl(file);
            applyEarthTexture(tex);
            toast(`Loaded Earth map: ${file}`);
            return true;
        } catch {
            // ignore and try next
        }
    }
    return false;
}

async function tryLoadBundledOverlay({ key, candidates, apply, toastPrefix }) {
    for (const file of candidates) {
        try {
            const tex = await loadTextureFromUrl(file);
            apply(tex);
            toast(`${toastPrefix}: ${file}`);
            return true;
        } catch {
            // ignore
        }
    }
    return false;
}

async function tryLoadEarthMapFromSavedDataUrl() {
    const dataUrl = localStorage.getItem(LS_EARTH_TEXTURE_DATAURL_KEY);
    if (!dataUrl) return false;
    try {
        const tex = await loadTextureFromUrl(dataUrl);
        applyEarthTexture(tex);
        toast('Loaded saved Earth map.');
        return true;
    } catch {
        localStorage.removeItem(LS_EARTH_TEXTURE_DATAURL_KEY);
        return false;
    }
}

function setEarthBumpMap(tex, bumpScale = 0.25) {
    // Height/bump maps should be treated as data (keep linear).
    if (tex) tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    replaceMaterialTexture(earthMat, 'bumpMap', tex || null);
    earthMat.bumpScale = tex ? bumpScale : 0;
    earthMat.needsUpdate = true;
}

const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.02, 64, 64);
const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x2ee9ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
});
earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

// Satellites (as a Points cloud for performance)
const satellitesGroup = new THREE.Group();
earthGroup.add(satellitesGroup);

const satSprite = createCircleSpriteTexture();
const satMat = new THREE.PointsMaterial({
    color: 0xfff08a,
    size: 0.12,
    sizeAttenuation: true,
    map: satSprite,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
});

let satPoints = null;
let renderedSatellites = [];

const selectionMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x2ee9ff })
);
selectionMarker.visible = false;
satellitesGroup.add(selectionMarker);

let selectedSatelliteName = null;

function calcPosFromLatLonRad(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function formatDeg(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(3)}°`;
}

function formatKm(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(1)} km`;
}

function setSelectionUi(sat) {
    if (!sat) {
        satInfoEl.hidden = true;
        satNameEl.textContent = '—';
        satLatEl.textContent = '—';
        satLonEl.textContent = '—';
        satAltEl.textContent = '—';
        selectionMarker.visible = false;
        selectedSatelliteName = null;
        return;
    }

    satInfoEl.hidden = false;
    satNameEl.textContent = String(sat?.name || '—');
    satLatEl.textContent = formatDeg(Number(sat?.lat));
    satLonEl.textContent = formatDeg(Number(sat?.lon));
    satAltEl.textContent = formatKm(Number(sat?.elevation_km));
}

function updateSelectionMarkerByIndex(index) {
    if (!satPoints || !satPoints.geometry) return;
    const attr = satPoints.geometry.getAttribute('position');
    if (!attr || !Number.isFinite(index) || index < 0 || index >= attr.count) return;
    selectionMarker.position.set(attr.getX(index), attr.getY(index), attr.getZ(index));
    selectionMarker.visible = true;
}

function selectSatelliteByIndex(index) {
    const sat = renderedSatellites?.[index];
    if (!sat) return;
    selectedSatelliteName = String(sat?.name || '');
    setSelectionUi(sat);
    updateSelectionMarkerByIndex(index);
}

function setSatellites(satellites) {
    const positions = new Float32Array(satellites.length * 3);
    const aligned = [];
    let written = 0;

    for (const sat of satellites) {
        const lat = Number(sat?.lat);
        const lon = Number(sat?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const elevationKm = Number(sat?.elevation_km);
        const altitudeBoost = Number.isFinite(elevationKm) ? Math.min(0.6, elevationKm / 2000) * 0.25 : 0;
        const orbitRadius = earthRadius + 0.25 + altitudeBoost;
        const p = calcPosFromLatLonRad(lat, lon, orbitRadius);
        positions[written * 3 + 0] = p.x;
        positions[written * 3 + 1] = p.y;
        positions[written * 3 + 2] = p.z;
        aligned.push(sat);
        written++;
    }

    const finalPositions = written === satellites.length ? positions : positions.slice(0, written * 3);

    renderedSatellites = aligned;

    if (!satPoints) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3));
        satPoints = new THREE.Points(geo, satMat);
        satellitesGroup.add(satPoints);
    } else {
        const geo = satPoints.geometry;
        const attr = geo.getAttribute('position');
        if (attr && attr.array && attr.array.length === finalPositions.length) {
            attr.array.set(finalPositions);
            attr.needsUpdate = true;
        } else {
            satPoints.geometry.dispose();
            const next = new THREE.BufferGeometry();
            next.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3));
            satPoints.geometry = next;
        }
    }

    satCountEl.textContent = String(written);

    if (selectedSatelliteName) {
        const idx = renderedSatellites.findIndex((s) => String(s?.name || '') === selectedSatelliteName);
        if (idx >= 0) {
            setSelectionUi(renderedSatellites[idx]);
            updateSelectionMarkerByIndex(idx);
        } else {
            setSelectionUi(null);
        }
    }
}

async function fetchWithTimeout(url, { timeoutMs = 8000 } = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(t);
    }
}

function withRefreshParam(url, forceRefresh) {
    if (!forceRefresh) return url;
    const u = new URL(url);
    u.searchParams.set('refresh', 'true');
    return u.toString();
}

let fetchInFlight = false;
let lastLiveErrorToastAt = 0;

async function fetchSatellites({ forceRefresh = false, reason = 'manual', quiet = false } = {}) {
    if (fetchInFlight) {
        if (reason !== 'manual') return;
    }

    persistUiState();

    const url = resolveUrl(apiUrlInput.value);
    if (!url) {
        if (!quiet) toast('Invalid API URL.', { kind: 'error' });
        setStatus('Invalid API URL');
        return;
    }
    const finalUrl = withRefreshParam(url, forceRefresh);

    if (reason === 'initial' || reason === 'manual') setStatus('Loading…');
    if (reason === 'manual') refreshBtn.disabled = true;
    fetchInFlight = true;

    try {
        const response = await fetchWithTimeout(finalUrl, { timeoutMs: 9000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        const satellites = Array.isArray(json) ? json : json?.data;
        if (!Array.isArray(satellites)) throw new Error('Unexpected response shape (expected array or {data: []}).');

        setSatellites(satellites);
        lastUpdatedEl.textContent = formatTime(Date.now());
        setStatus(liveToggle.checked ? 'Live' : 'Connected');
    } catch (err) {
        satCountEl.textContent = '—';
        setStatus(liveToggle.checked ? 'Disconnected' : 'Error');
        if (!quiet) {
            toast(`Failed to load satellites: ${err?.message || err}`, { kind: 'error' });
        } else if (reason === 'live') {
            const now = Date.now();
            if (now - lastLiveErrorToastAt > 30000) {
                lastLiveErrorToastAt = now;
                toast(`Live update failed: ${err?.message || err}`, { kind: 'error', ms: 2500 });
            }
        }
        console.error('Error fetching satellite data:', err);
    } finally {
        if (reason === 'manual') refreshBtn.disabled = false;
        fetchInFlight = false;
    }
}

function resetView() {
    camera.position.set(0, 0, 15);
    controls.target.set(0, 0, 0);
    controls.update();
}

function resizeToContainer() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

const ro = new ResizeObserver(() => resizeToContainer());
ro.observe(container);
resizeToContainer();

loadInitialUiState();
setStatus('Idle');

function applyLayerParamsFromUi() {
    boundariesMat.opacity = Number(boundariesOpacityInput.value) || 0.85;
    boundariesMat.needsUpdate = true;
    weatherMat.opacity = Number(weatherOpacityInput.value) || 0.65;
    weatherMat.needsUpdate = true;
    const strength = Number(heightStrengthInput.value);
    earthMat.bumpScale = earthMat.bumpMap ? (Number.isFinite(strength) ? strength : 0.25) : 0;
    earthMat.needsUpdate = true;
}

applyLayerParamsFromUi();

refreshBtn.addEventListener('click', (e) =>
    fetchSatellites({ forceRefresh: Boolean(e.shiftKey), reason: 'manual', quiet: false })
);
resetBtn.addEventListener('click', () => resetView());
autorotateToggle.addEventListener('change', () => persistUiState());
liveToggle.addEventListener('change', () => {
    persistUiState();
    syncLivePolling();
});
liveIntervalSelect.addEventListener('change', () => {
    persistUiState();
    syncLivePolling();
});
apiUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchSatellites();
});
apiUrlInput.addEventListener('blur', () => persistUiState());

clearSelectionBtn.addEventListener('click', () => setSelectionUi(null));

earthUploadBtn.addEventListener('click', () => earthTextureFile.click());
earthResetBtn.addEventListener('click', () => resetEarthTextureToProcedural());
earthTextureFile.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    earthTextureFile.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
        const tex = await loadTextureFromUrl(objectUrl);
        applyEarthTexture(tex);
        toast('Loaded Earth map image.');

        // Best-effort persistence (avoid blowing up localStorage).
        const maxBytes = 1_500_000; // ~1.5MB
        if (file.size <= maxBytes) {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || '');
                try {
                    localStorage.setItem(LS_EARTH_TEXTURE_DATAURL_KEY, dataUrl);
                } catch {
                    // ignore quota errors
                }
            };
            reader.readAsDataURL(file);
        } else {
            localStorage.removeItem(LS_EARTH_TEXTURE_DATAURL_KEY);
        }
    } catch (err) {
        toast(`Failed to load Earth map: ${err?.message || err}`, { kind: 'error' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
});

boundariesUploadBtn.addEventListener('click', () => boundariesTextureFile.click());
boundariesClearBtn.addEventListener('click', () => {
    applyOverlayTexture(boundariesMat, boundariesMesh, null);
    toast('Boundaries overlay cleared.');
});
boundariesOpacityInput.addEventListener('input', () => {
    applyLayerParamsFromUi();
    persistUiState();
});
boundariesTextureFile.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    boundariesTextureFile.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
        const tex = await loadTextureFromUrl(objectUrl);
        applyOverlayTexture(boundariesMat, boundariesMesh, tex);
        toast('Loaded boundaries overlay.');
    } catch (err) {
        toast(`Failed to load boundaries: ${err?.message || err}`, { kind: 'error' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
});

heightUploadBtn.addEventListener('click', () => heightTextureFile.click());
heightClearBtn.addEventListener('click', () => {
    setEarthBumpMap(null, 0);
    applyLayerParamsFromUi();
    toast('Height/bump map cleared.');
});
heightStrengthInput.addEventListener('input', () => {
    applyLayerParamsFromUi();
    persistUiState();
});
heightTextureFile.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    heightTextureFile.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
        const tex = await loadTextureFromUrl(objectUrl);
        const strength = Number(heightStrengthInput.value) || 0.25;
        setEarthBumpMap(tex, strength);
        applyLayerParamsFromUi();
        toast('Loaded height/bump map.');
    } catch (err) {
        toast(`Failed to load height map: ${err?.message || err}`, { kind: 'error' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
});

weatherUploadBtn.addEventListener('click', () => weatherTextureFile.click());
weatherClearBtn.addEventListener('click', () => {
    applyOverlayTexture(weatherMat, weatherMesh, null);
    toast('Weather overlay cleared.');
});
weatherOpacityInput.addEventListener('input', () => {
    applyLayerParamsFromUi();
    persistUiState();
});
weatherUrlInput.addEventListener('blur', () => persistUiState());
weatherIntervalSelect.addEventListener('change', () => {
    persistUiState();
    syncWeatherLive();
});
weatherLiveToggle.addEventListener('change', () => {
    persistUiState();
    syncWeatherLive();
});
weatherTextureFile.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    weatherTextureFile.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
        const tex = await loadTextureFromUrl(objectUrl);
        applyOverlayTexture(weatherMat, weatherMesh, tex);
        toast('Loaded weather overlay.');
    } catch (err) {
        toast(`Failed to load weather: ${err?.message || err}`, { kind: 'error' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
});

function animate() {
    requestAnimationFrame(animate);
    if (autorotateToggle.checked) earthGroup.rotation.y += 0.001;
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- Picking (tap/click a satellite) ---
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.18;
const pointer = new THREE.Vector2();

function pickSatelliteFromEvent(e) {
    if (!satPoints) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointer.set(x, y);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(satPoints, false);
    if (!hits || hits.length === 0) return;
    const idx = hits[0]?.index;
    if (Number.isFinite(idx)) selectSatelliteByIndex(idx);
}

let pointerDown = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
    pointerDown = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointerup', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if ((dx * dx + dy * dy) > 25) return; // likely a drag
    pickSatelliteFromEvent(e);
});
renderer.domElement.addEventListener('pointercancel', () => (pointerDown = null));
renderer.domElement.addEventListener('pointerleave', () => (pointerDown = null));

// --- Live polling ---
let liveTimer = null;

function stopLivePolling() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = null;
}

function startLivePolling() {
    stopLivePolling();
    const pollMs = Math.max(250, Number(liveIntervalSelect.value) || 2000);
    liveTimer = setInterval(() => {
        if (document.hidden) return;
        fetchSatellites({ reason: 'live', quiet: true });
    }, pollMs);
}

function syncLivePolling() {
    if (liveToggle.checked) {
        startLivePolling();
        fetchSatellites({ reason: 'live', quiet: true });
    } else {
        stopLivePolling();
        setStatus(satPoints ? 'Connected' : 'Idle');
    }
}

document.addEventListener('visibilitychange', () => {
    if (!liveToggle.checked) return;
    if (!document.hidden) fetchSatellites({ reason: 'live', quiet: true });
});

syncLivePolling();

// --- Weather overlay live reload ---
let weatherTimer = null;

function stopWeatherLive() {
    if (weatherTimer) clearInterval(weatherTimer);
    weatherTimer = null;
}

function withCacheBuster(url) {
    const u = new URL(url);
    u.searchParams.set('_t', String(Date.now()));
    return u.toString();
}

async function loadWeatherOverlayFromUrl({ quiet = false } = {}) {
    const url = resolveUrl(weatherUrlInput.value);
    if (!url) {
        if (!quiet) toast('Invalid Weather URL.', { kind: 'error' });
        return;
    }
    try {
        const tex = await loadTextureFromUrl(withCacheBuster(url));
        applyOverlayTexture(weatherMat, weatherMesh, tex);
        applyLayerParamsFromUi();
    } catch (err) {
        if (!quiet) toast(`Failed to load weather URL: ${err?.message || err}`, { kind: 'error' });
    }
}

function syncWeatherLive() {
    stopWeatherLive();
    if (!weatherLiveToggle.checked) return;
    const url = resolveUrl(weatherUrlInput.value);
    if (!url) return;
    const ms = Math.max(2000, Number(weatherIntervalSelect.value) || 10000);
    weatherTimer = setInterval(() => {
        if (document.hidden) return;
        loadWeatherOverlayFromUrl({ quiet: true });
    }, ms);
    loadWeatherOverlayFromUrl({ quiet: true });
}

// Load a "real map" texture if the user has one saved or bundled in frontend/
(async () => {
    const loaded = await tryLoadEarthMapFromSavedDataUrl();
    if (!loaded) await tryLoadBundledEarthMap();

    await tryLoadBundledOverlay({
        candidates: ['boundaries.png', 'boundaries.webp', 'boundaries.jpg', 'boundaries.jpeg'],
        apply: (tex) => applyOverlayTexture(boundariesMat, boundariesMesh, tex),
        toastPrefix: 'Loaded boundaries',
    });

    await tryLoadBundledOverlay({
        candidates: ['weather.png', 'weather.webp', 'weather.jpg', 'weather.jpeg'],
        apply: (tex) => applyOverlayTexture(weatherMat, weatherMesh, tex),
        toastPrefix: 'Loaded weather',
    });

    // Optional bump map (treat as data)
    for (const file of ['height.png', 'height.webp', 'height.jpg', 'height.jpeg']) {
        try {
            const tex = await loadTextureFromUrl(file);
            setEarthBumpMap(tex, Number(heightStrengthInput.value) || 0.25);
            applyLayerParamsFromUi();
            toast(`Loaded height: ${file}`);
            break;
        } catch {
            // ignore
        }
    }

    syncWeatherLive();
})();
