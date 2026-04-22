// Game State — load settings saved from the menu screen
const _cfg       = JSON.parse(sessionStorage.getItem('pinpoint_settings') || 'null');
const maxRounds  = _cfg ? _cfg.rounds : 10;
const timerDuration = _cfg ? _cfg.time   : 120;
const winRadius  = _cfg ? _cfg.radius : 1.0;

// Detect whether this is one of the 3 official presets (not custom)
// Official presets: Tourist 15/180/5, Navigator 10/120/1, Legend 6/60/0.7
const OFFICIAL_PRESETS = {
    tourist:   { rounds: 15, time: 180, radius: 5   },
    navigator: { rounds: 10, time: 120, radius: 1   },
    legend:    { rounds: 6,  time: 60,  radius: 0.7 }
};
function detectDifficulty(cfg) {
    if (!cfg) return null;
    for (const [name, p] of Object.entries(OFFICIAL_PRESETS)) {
        if (cfg.rounds === p.rounds && cfg.time === p.time && cfg.radius === p.radius) return name;
    }
    return null; // custom — not tracked
}
const officialDifficulty = detectDifficulty(_cfg); // null = custom game
const gameStartedAt = new Date().toISOString();

let currentRound = 1;
// Target is stored XOR-encoded with a per-session random key — never readable as plain coordinates
const _target = (() => {
    const _k = (Math.random() * 0xFFFFFFFF) >>> 0;
    let _a = 0, _b = 0;
    const _e = n => ((n * 1e7) | 0) ^ _k;
    const _d = n => ((n ^ _k) | 0) / 1e7;
    return {
        set(lat, lng) { _a = _e(lat); _b = _e(lng); },
        get() { return { lat: _d(_a), lng: _d(_b) }; }
    };
})();
let currentGuess = null;
let lastGuess = null;
let timerSeconds = timerDuration;
let timerInterval;
let bulgariaFeature = null;
let bulgariaMainland = null;
const allDistances = [];

// Map Initialization
const map = L.map('map').setView([42.6977, 25.3219], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CartoDB',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

let guessMarker = null;

// Initialize Game Borders
async function initGame() {
    try {
        const res = await fetch('data/bulgaria.geojson');
        const geojson = await res.json();

        // Support raw Geometry, Feature, or FeatureCollection (e.g. GADM format)
        bulgariaFeature = geojson.type === 'FeatureCollection' ? geojson.features[0]
                        : geojson.type === 'Feature'           ? geojson
                        : turf.feature(geojson);

        // Extract mainland (largest polygon) — excludes Black Sea islands
        const geom = bulgariaFeature.geometry;
        if (geom.type === 'MultiPolygon') {
            let maxArea = 0, mainCoords = null;
            geom.coordinates.forEach(coords => {
                const area = turf.area(turf.polygon(coords));
                if (area > maxArea) { maxArea = area; mainCoords = coords; }
            });
            bulgariaMainland = turf.polygon(mainCoords);
        } else {
            bulgariaMainland = bulgariaFeature;
        }

        // Gray-out mask (World minus Bulgaria)
        const world = turf.bboxPolygon([-180, -90, 180, 90]);
        const mask = turf.difference(world, bulgariaFeature);

        L.geoJSON(mask, {
            style: { fillColor: '#555', fillOpacity: 0.65, color: 'transparent', weight: 0 },
            interactive: false
        }).addTo(map);

        L.geoJSON(bulgariaFeature, {
            style: { color: 'black', weight: 4, fillColor: 'transparent', fillOpacity: 0 },
            interactive: false
        }).addTo(map);

        // Apply dynamic settings to the UI
        const mrEl = document.getElementById('max-rounds-display');
        if (mrEl) mrEl.textContent = maxRounds;
        document.getElementById('stat-count').innerText = '0 / ' + maxRounds;

        document.getElementById('loading-screen').style.display = 'none';
        generateTarget();
        startTimer();

    } catch (error) {
        alert('Failed to load country borders. Make sure bulgaria.geojson is in the same folder.');
        console.error(error);
    }
}

// Generate target strictly on mainland Bulgaria (no Black Sea islands)
function generateTarget() {
    const bbox = turf.bbox(bulgariaMainland);
    let valid = false;

    while (!valid) {
        const lng = Math.random() * (bbox[2] - bbox[0]) + bbox[0];
        const lat = Math.random() * (bbox[3] - bbox[1]) + bbox[1];
        const pt = turf.point([lng, lat]);

        if (turf.booleanPointInPolygon(pt, bulgariaMainland)) {
            _target.set(lat, lng);
            valid = true;
        }
    }
}

// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pin icon helpers
function createGuessIcon(roundNum) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="50" viewBox="0 0 36 50">
        <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 50 18 50 C18 50 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z" fill="#0275d8" stroke="white" stroke-width="1.5"/>
        <circle cx="18" cy="18" r="10" fill="white"/>
        <text x="18" y="22" text-anchor="middle" font-size="12" font-weight="bold" fill="#0275d8" font-family="sans-serif">${roundNum}</text>
    </svg>`;
    return L.divIcon({ className: '', html: svg, iconSize: [36, 50], iconAnchor: [18, 50] });
}

function createTargetIcon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="50" viewBox="0 0 36 50">
        <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 50 18 50 C18 50 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z" fill="#d9534f" stroke="white" stroke-width="1.5"/>
        <circle cx="18" cy="18" r="10" fill="white"/>
        <text x="18" y="23" text-anchor="middle" font-size="15" fill="#d9534f" font-family="sans-serif">★</text>
    </svg>`;
    return L.divIcon({ className: '', html: svg, iconSize: [36, 50], iconAnchor: [18, 50] });
}

// Handle Map Clicks
map.on('click', function (e) {
    const clickedPoint = turf.point([e.latlng.lng, e.latlng.lat]);

    if (!turf.booleanPointInPolygon(clickedPoint, bulgariaFeature)) return;

    currentGuess = { lat: e.latlng.lat, lng: e.latlng.lng };

    if (guessMarker) map.removeLayer(guessMarker);
    guessMarker = L.marker([currentGuess.lat, currentGuess.lng]).addTo(map);
    document.getElementById('confirm-btn').disabled = false;
});

// Timer Logic
function startTimer() {
    clearInterval(timerInterval);
    timerSeconds = timerDuration;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            autoPick();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    document.getElementById('timer').innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Auto-pick (50 km offset from last guess, must land on mainland)
function autoPick() {
    const baseLat = lastGuess ? lastGuess.lat : 42.6977;
    const baseLng = lastGuess ? lastGuess.lng : 23.3219;

    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
        const angle = Math.random() * Math.PI * 2;
        const offsetDeg = 50 / 111;
        const testLat = baseLat + Math.cos(angle) * offsetDeg;
        const testLng = baseLng + Math.sin(angle) * offsetDeg;

        if (turf.booleanPointInPolygon(turf.point([testLng, testLat]), bulgariaMainland)) {
            currentGuess = { lat: testLat, lng: testLng };
            valid = true;
        }
        attempts++;
    }

    if (!valid) currentGuess = { lat: baseLat, lng: baseLng };

    processGuess();
}

// Process the locked-in guess
function processGuess() {
    clearInterval(timerInterval);
    lastGuess = { ...currentGuess };

    const _t = _target.get();
    const distance = calculateDistance(currentGuess.lat, currentGuess.lng, _t.lat, _t.lng);

    L.marker([currentGuess.lat, currentGuess.lng], { icon: createGuessIcon(currentRound), interactive: false }).addTo(map);
    if (guessMarker) { map.removeLayer(guessMarker); guessMarker = null; }

    const row = document.createElement('tr');
    row.innerHTML = `<td>${currentRound}</td><td>${distance.toFixed(2)} km</td>`;
    document.getElementById('history-body').appendChild(row);
    updateLiveStats(distance);

    if (distance <= winRadius) {
        endGame(true, distance);
        return;
    }

    if (currentRound >= maxRounds) {
        endGame(false, distance);
    } else {
        currentRound++;
        document.getElementById('round-display').innerText = currentRound;
        document.getElementById('confirm-btn').disabled = true;
        currentGuess = null;
        startTimer();
    }
}

document.getElementById('confirm-btn').addEventListener('click', processGuess);

// Submit game result to Supabase
async function submitResult(won, finalDistance) {
    // Skip if custom difficulty — not tracked
    if (!officialDifficulty) return;

    // Skip if not logged in — show guest save prompt for official games
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        const panel = document.getElementById('result-panel');
        if (panel && !panel.querySelector('.guest-save-prompt')) {
            const p = document.createElement('p');
            p.className = 'guest-save-prompt';
            p.innerHTML = `<a href="auth.html?from=game.html">Sign in</a> to save your result.`;
            panel.appendChild(p);
        }
        return;
    }

    // ── Server-side-style validation before sending ──────────
    const maxForDiff = OFFICIAL_PRESETS[officialDifficulty].rounds;
    if (currentRound < 1 || currentRound > maxForDiff) return; // impossible attempt count
    if (won && (finalDistance <= 0 || finalDistance > winRadius)) return; // impossible winning distance

    const record = {
        user_id:              session.user.id,
        difficulty:           officialDifficulty,
        won:                  won,
        winning_distance_km:  won ? parseFloat(finalDistance.toFixed(4)) : null,
        attempts_used:        currentRound,
        started_at:           gameStartedAt,
        completed_at:         new Date().toISOString()
    };

    // Plausibility: game must have taken at least (attempts * 3) seconds
    const elapsed = (new Date(record.completed_at) - new Date(record.started_at)) / 1000;
    if (elapsed < currentRound * 3) return; // too fast to be real

    const { error } = await db.from('games').insert(record);
    if (error) console.warn('Result not saved:', error.message);
}

function endGame(won, finalDistance) {
    clearInterval(timerInterval);

    // Submit result to Supabase (only official difficulties, only logged-in users)
    submitResult(won, finalDistance);

    document.getElementById('confirm-btn').style.display = 'none';
    document.querySelector('.stats').style.display = 'none';

    const resultPanel = document.getElementById('result-panel');
    const title = document.getElementById('end-title');
    const message = document.getElementById('end-message');

    resultPanel.style.display = 'block';
    resultPanel.style.borderLeftColor = won ? '#5cb85c' : '#d9534f';

    if (won) {
        title.innerText = 'You Found It!';
        title.style.color = '#5cb85c';
        message.innerText = `Incredible! You pinned the target within ${finalDistance.toFixed(3)} km!`;
    } else {
        title.innerText = 'Out of Rounds';
        title.style.color = '#d9534f';
        message.innerText = `The target was ${finalDistance.toFixed(2)} km away from your final guess.`;
    }

    const _r = _target.get();
    L.marker([_r.lat, _r.lng], { icon: createTargetIcon() }).addTo(map);
    map.flyTo([_r.lat, _r.lng], 12);
}

// Live session stats updater
function updateLiveStats(distance) {
    allDistances.push(distance);
    const best = Math.min(...allDistances);
    const avg = allDistances.reduce((a, b) => a + b, 0) / allDistances.length;
    const bestRound = allDistances.indexOf(best) + 1;
    document.getElementById('stat-best').innerText = best.toFixed(2) + ' km';
    document.getElementById('stat-best-round').innerText = 'Round ' + bestRound;
    document.getElementById('stat-avg').innerText = avg.toFixed(2) + ' km';
    document.getElementById('stat-count').innerText = allDistances.length + ' / ' + maxRounds;
}

// Resizable panel
(function () {
    const panel = document.getElementById('ui-panel');
    const handle = document.getElementById('resize-handle');
    let isResizing = false;
    handle.addEventListener('mousedown', e => {
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!isResizing) return;
        const newWidth = Math.min(420, Math.max(240, e.clientX));
        panel.style.width = newWidth + 'px';
        panel.style.flexBasis = newWidth + 'px';
        map.invalidateSize();
    });
    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
})();

// Boot the game
initGame();
