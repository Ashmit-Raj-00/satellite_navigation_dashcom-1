const container = document.getElementById('canvas-container');
const apiUrlInput = document.getElementById('api-url');
const refreshBtn = document.getElementById('btn-refresh');
const resetBtn = document.getElementById('btn-reset');
const autorotateToggle = document.getElementById('toggle-autorotate');
const statusEl = document.getElementById('status');
const satCountEl = document.getElementById('sat-count');
const lastUpdatedEl = document.getElementById('last-updated');
const toastEl = document.getElementById('toast');

const DEFAULT_API_URL = 'http://localhost:8000/satellites';
const LS_API_URL_KEY = 'satellite-tracker:api-url';
const LS_AUTOROTATE_KEY = 'satellite-tracker:autorotate';

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
}

function persistUiState() {
    localStorage.setItem(LS_API_URL_KEY, apiUrlInput.value.trim());
    localStorage.setItem(LS_AUTOROTATE_KEY, String(autorotateToggle.checked));
}

// --- THREE.JS SCENE ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
container.appendChild(renderer.domElement);

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

const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
const earthTex = createProceduralEarthTexture();
const earthMat = new THREE.MeshStandardMaterial({
    map: earthTex,
    roughness: 1.0,
    metalness: 0.0,
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
earthGroup.add(earthMesh);

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

function calcPosFromLatLonRad(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function setSatellites(satellites) {
    const positions = new Float32Array(satellites.length * 3);
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
        written++;
    }

    const finalPositions = written === satellites.length ? positions : positions.slice(0, written * 3);

    if (satPoints) {
        satellitesGroup.remove(satPoints);
        satPoints.geometry.dispose();
        satPoints = null;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3));
    satPoints = new THREE.Points(geo, satMat);
    satellitesGroup.add(satPoints);

    satCountEl.textContent = String(written);
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

async function fetchSatellites({ forceRefresh = false } = {}) {
    persistUiState();

    const url = resolveUrl(apiUrlInput.value);
    if (!url) {
        toast('Invalid API URL.', { kind: 'error' });
        setStatus('Invalid API URL');
        return;
    }
    const finalUrl = withRefreshParam(url, forceRefresh);

    setStatus('Loading…');
    refreshBtn.disabled = true;

    try {
        const response = await fetchWithTimeout(finalUrl, { timeoutMs: 9000 });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const json = await response.json();
        const satellites = Array.isArray(json) ? json : json?.data;
        if (!Array.isArray(satellites)) throw new Error('Unexpected response shape (expected array or {data: []}).');

        setSatellites(satellites);
        lastUpdatedEl.textContent = formatTime(Date.now());
        setStatus('Connected');
    } catch (err) {
        satCountEl.textContent = '—';
        setStatus('Error');
        toast(`Failed to load satellites: ${err?.message || err}`, { kind: 'error' });
        console.error('Error fetching satellite data:', err);
    } finally {
        refreshBtn.disabled = false;
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

refreshBtn.addEventListener('click', (e) => fetchSatellites({ forceRefresh: Boolean(e.shiftKey) }));
resetBtn.addEventListener('click', () => resetView());
autorotateToggle.addEventListener('change', () => persistUiState());
apiUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchSatellites();
});
apiUrlInput.addEventListener('blur', () => persistUiState());

fetchSatellites();

function animate() {
    requestAnimationFrame(animate);
    if (autorotateToggle.checked) earthGroup.rotation.y += 0.001;
    controls.update();
    renderer.render(scene, camera);
}
animate();
