// ── State ──
const cfg = { rounds: 10, time: 120, radius: 1.0 };

// ── Slider fill track ──
function fillSlider(el) {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--fill', pct + '%');
}

// ── Time formatter ──
function fmtTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

// ── Update display values ──
function updateDisplays() {
    document.getElementById('val-rounds').textContent = document.getElementById('sl-rounds').value;
    document.getElementById('val-time').textContent   = fmtTime(+document.getElementById('sl-time').value);
    document.getElementById('val-radius').textContent = (+document.getElementById('sl-radius').value).toFixed(1) + ' km';
    fillSlider(document.getElementById('sl-rounds'));
    fillSlider(document.getElementById('sl-time'));
    fillSlider(document.getElementById('sl-radius'));
}

// ── Sync sliders to cfg ──
function syncSliders() {
    document.getElementById('sl-rounds').value = cfg.rounds;
    document.getElementById('sl-time').value   = cfg.time;
    document.getElementById('sl-radius').value = cfg.radius;
    updateDisplays();
}

// ── Difficulty cards ──
document.querySelectorAll('.diff-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        cfg.rounds = +card.dataset.rounds;
        cfg.time   = +card.dataset.time;
        cfg.radius = +card.dataset.radius;
        syncSliders();
    });
});

// ── Slider listeners ──
['sl-rounds', 'sl-time', 'sl-radius'].forEach(id => {
    document.getElementById(id).addEventListener('input', function () {
        cfg.rounds = +document.getElementById('sl-rounds').value;
        cfg.time   = +document.getElementById('sl-time').value;
        cfg.radius = +document.getElementById('sl-radius').value;
        updateDisplays();
        // Deselect presets when manually adjusting
        document.querySelectorAll('.diff-card').forEach(c => c.classList.remove('selected'));
    });
});

// ── Custom settings toggle ──
const toggle = document.getElementById('customToggle');
const panel  = document.getElementById('customPanel');
toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    panel.classList.toggle('open');
});

// ── Start game ──
document.getElementById('startBtn').addEventListener('click', () => {
    sessionStorage.setItem('pinpoint_settings', JSON.stringify(cfg));
    window.location.href = 'game.html';
});

// ── Init ──
syncSliders();
