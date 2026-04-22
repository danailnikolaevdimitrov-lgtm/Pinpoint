// ── State ────────────────────────────────────────────────
let currentLb   = 'wins';
let currentDiff = 'navigator';
let myUsername  = null;

// ── Auth bar ─────────────────────────────────────────────
db.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return;
    const { data: prof } = await db.from('profiles').select('username').eq('id', session.user.id).single();
    if (prof) myUsername = prof.username;
});

// ── Tab switching ─────────────────────────────────────────
document.querySelectorAll('.lb-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-type-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLb = btn.dataset.lb;
        loadLeaderboard();
    });
});

document.querySelectorAll('.lb-diff-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lb-diff-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDiff = btn.dataset.diff;
        loadLeaderboard();
    });
});

// ── Helpers ───────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'];

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statLabel() {
    if (currentLb === 'wins')     return 'Wins';
    if (currentLb === 'distance') return 'Distance';
    return 'Attempts';
}

function formatStat(row) {
    if (currentLb === 'wins')     return row.wins + ' win' + (row.wins !== 1 ? 's' : '');
    if (currentLb === 'distance') return row.winning_distance_km.toFixed(3) + ' km';
    return row.attempts_used + (row.attempts_used === 1 ? ' attempt' : ' attempts');
}

function statDate(row) {
    if (currentLb === 'wins')     return formatDate(row.first_win_at);
    return formatDate(row.completed_at);
}

// ── Fetch & render ────────────────────────────────────────
async function loadLeaderboard() {
    document.getElementById('lb-content').innerHTML =
        '<div class="lb-state"><span class="state-icon">⏳</span>Loading…</div>';

    const viewMap = {
        wins:     { view: 'leaderboard_wins',     order: [{ col: 'wins', asc: false }, { col: 'first_win_at', asc: true }] },
        distance: { view: 'leaderboard_distance', order: [{ col: 'winning_distance_km', asc: true }, { col: 'completed_at', asc: true }] },
        attempts: { view: 'leaderboard_attempts', order: [{ col: 'attempts_used', asc: true }, { col: 'completed_at', asc: true }] },
    };

    const { view, order } = viewMap[currentLb];

    // Fetch top 100
    let query = db.from(view).select('*').eq('difficulty', currentDiff);
    order.forEach(o => { query = query.order(o.col, { ascending: o.asc }); });
    query = query.limit(100);

    const { data: rows, error } = await query;

    if (error) {
        document.getElementById('lb-content').innerHTML =
            '<div class="lb-state"><span class="state-icon">⚠️</span>Failed to load. Try refreshing.</div>';
        return;
    }

    if (!rows || rows.length === 0) {
        document.getElementById('lb-content').innerHTML =
            '<div class="lb-state"><span class="state-icon">🎮</span>No results yet.<br>Be the first to play!</div>';
        return;
    }

    // Check if logged-in user is in top 100
    const myIndex = myUsername ? rows.findIndex(r => r.username === myUsername) : -1;

    // Fetch user's own row if not in top 100
    let myRow = null;
    if (myUsername && myIndex === -1) {
        const { data: myData } = await db
            .from(view).select('*')
            .eq('difficulty', currentDiff)
            .eq('username', myUsername)
            .maybeSingle();
        myRow = myData;
    }

    // ── Build table ──
    const thead = `
        <thead>
            <tr>
                <th>#</th>
                <th>Player</th>
                <th class="date-cell">${currentLb === 'wins' ? 'First Win' : 'Achieved'}</th>
                <th>${statLabel()}</th>
            </tr>
        </thead>`;

    const tbody = rows.map((row, i) => {
        const rank    = i + 1;
        const isMe    = myUsername && row.username === myUsername;
        const rankCell = rank <= 3
            ? `<span class="rank-medal">${MEDALS[rank - 1]}</span>`
            : `<span style="color:rgba(240,240,240,0.3)">${rank}</span>`;

        return `
            <tr class="${isMe ? 'is-me' : ''}">
                <td class="rank-cell ${rank <= 3 ? 'top3' : ''}">${rankCell}</td>
                <td>
                    <div class="username-cell">
                        <a href="profile.html?u=${encodeURIComponent(row.username)}">${escHtml(row.username)}</a>
                        ${isMe ? '<span class="you-badge">You</span>' : ''}
                    </div>
                </td>
                <td class="date-cell">${statDate(row)}</td>
                <td>${formatStat(row)}</td>
            </tr>`;
    }).join('');

    // Pinned user row (outside top 100)
    const pinnedRow = (myRow && myIndex === -1) ? `
        <tr class="lb-pinned">
            <td class="rank-cell"><span style="color:rgba(240,240,240,0.3)">&gt;100</span></td>
            <td>
                <div class="username-cell">
                    <a href="profile.html?u=${encodeURIComponent(myRow.username)}">${escHtml(myRow.username)}</a>
                    <span class="you-badge">You</span>
                </div>
            </td>
            <td class="date-cell">${statDate(myRow)}</td>
            <td>${formatStat(myRow)}</td>
        </tr>` : '';

    document.getElementById('lb-content').innerHTML = `
        <table class="lb-table">
            ${thead}
            <tbody>${tbody}</tbody>
        </table>
        ${pinnedRow ? `<table class="lb-table">${pinnedRow}</table>` : ''}`;
}

function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Initial load ──────────────────────────────────────────
loadLeaderboard();
