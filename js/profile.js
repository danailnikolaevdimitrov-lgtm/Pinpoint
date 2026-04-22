const DIFFS = [
    { key: 'tourist',   label: 'Tourist',   icon: '🌿' },
    { key: 'navigator', label: 'Navigator', icon: '🗺️' },
    { key: 'legend',    label: 'Legend',    icon: '⚡' },
];

// ── Auth state (for "You" badge) ──────────────────────────
let myUserId = null;
let myUsername = null;

async function initMySession() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    myUserId = session.user.id;
    const { data: prof } = await db
        .from('profiles').select('username').eq('id', session.user.id).single();
    if (prof) myUsername = prof.username;
}

// ── Load profile ─────────────────────────────────────────
async function loadProfile() {
    const params   = new URLSearchParams(window.location.search);
    const username = params.get('u');

    if (!username) {
        document.getElementById('pr-content').innerHTML =
            '<div class="pr-state"><span class="state-icon">❓</span>No username specified.</div>';
        return;
    }

    document.title = `Pinpoint — ${username}`;

    // Fetch profile row
    const { data: profile, error: profileErr } = await db
        .from('profiles')
        .select('id, username, created_at')
        .eq('username', username)
        .maybeSingle();

    if (profileErr || !profile) {
        document.getElementById('pr-content').innerHTML =
            '<div class="pr-state"><span class="state-icon">🔍</span>Player not found.</div>';
        return;
    }

    // Fetch all games for this user
    const { data: games, error: gamesErr } = await db
        .from('games')
        .select('difficulty, won, winning_distance_km, attempts_used, completed_at')
        .eq('user_id', profile.id);

    if (gamesErr) {
        document.getElementById('pr-content').innerHTML =
            '<div class="pr-state"><span class="state-icon">⚠️</span>Failed to load stats.</div>';
        return;
    }

    render(profile, games || []);
}

// ── Compute stats ─────────────────────────────────────────
function statsForDiff(games, diff) {
    const all  = games.filter(g => g.difficulty === diff);
    const wins = all.filter(g => g.won);
    const losses = all.filter(g => !g.won);

    if (all.length === 0) return null;

    const bestDist  = wins.length ? Math.min(...wins.map(g => g.winning_distance_km)) : null;
    const avgDist   = wins.length ? wins.reduce((s, g) => s + g.winning_distance_km, 0) / wins.length : null;
    const bestAttempts = wins.length ? Math.min(...wins.map(g => g.attempts_used)) : null;
    const avgAttempts  = wins.length ? wins.reduce((s, g) => s + g.attempts_used, 0) / wins.length : null;

    return {
        played: all.length,
        wins: wins.length,
        losses: losses.length,
        winRate: Math.round((wins.length / all.length) * 100),
        bestDist, avgDist,
        bestAttempts, avgAttempts,
    };
}

function fmt(val, decimals = 2, suffix = '') {
    if (val === null || val === undefined) return '—';
    return val.toFixed(decimals) + suffix;
}

// ── Render ────────────────────────────────────────────────
function render(profile, games) {
    const isMe = myUsername && myUsername.toLowerCase() === profile.username.toLowerCase();

    const totalWins   = games.filter(g => g.won).length;
    const totalPlayed = games.length;
    const totalLosses = totalPlayed - totalWins;
    const memberSince = new Date(profile.created_at)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Avatar letter
    const avatarLetter = profile.username[0].toUpperCase();

    // ── Hero HTML ──
    const heroHtml = `
        <div class="pr-hero anim anim-d1">
            <div class="pr-avatar">${escHtml(avatarLetter)}</div>
            <div class="pr-hero-info">
                <div class="pr-username">
                    ${escHtml(profile.username)}
                    ${isMe ? '<span class="pr-you-badge">You</span>' : ''}
                </div>
                <div class="pr-since">Member since ${memberSince}</div>
            </div>
        </div>`;

    // ── Overall stats ──
    const overallHtml = `
        <div class="pr-overall anim anim-d2">
            <div class="pr-overall-stat">
                <div class="pr-overall-val">${totalWins}</div>
                <div class="pr-overall-lbl">Total Wins</div>
            </div>
            <div class="pr-overall-stat">
                <div class="pr-overall-val">${totalLosses}</div>
                <div class="pr-overall-lbl">Losses</div>
            </div>
            <div class="pr-overall-stat">
                <div class="pr-overall-val">${totalPlayed ? Math.round((totalWins / totalPlayed) * 100) + '%' : '—'}</div>
                <div class="pr-overall-lbl">Win Rate</div>
            </div>
        </div>`;

    // ── Difficulty cards ──
    const diffCardsHtml = DIFFS.map(d => {
        const s = statsForDiff(games, d.key);

        if (!s) {
            return `
                <div class="pr-diff-card">
                    <div class="pr-diff-header">
                        <div class="pr-diff-name">
                            <span class="pr-diff-badge">${d.icon}</span>${d.label}
                        </div>
                    </div>
                    <div class="pr-empty">No games played on this difficulty yet.</div>
                </div>`;
        }

        const barWidth = s.winRate;
        return `
            <div class="pr-diff-card">
                <div class="pr-diff-header">
                    <div class="pr-diff-name">
                        <span class="pr-diff-badge">${d.icon}</span>${d.label}
                    </div>
                    <div class="pr-win-rate">
                        <b>${s.wins}</b> W &nbsp;·&nbsp; <b>${s.losses}</b> L
                        &nbsp;·&nbsp; <b>${s.winRate}%</b>
                    </div>
                </div>
                <div class="pr-bar-wrap" style="margin:0 20px 0; border-radius:0;">
                    <div class="pr-bar-fill" style="width:${barWidth}%"></div>
                </div>
                <div class="pr-diff-stats">
                    <div class="pr-stat-cell">
                        <div class="pr-stat-val ${s.bestDist === null ? 'muted' : ''}">
                            ${s.bestDist !== null ? s.bestDist.toFixed(3) + ' km' : '—'}
                        </div>
                        <div class="pr-stat-lbl">Best Distance</div>
                    </div>
                    <div class="pr-stat-cell">
                        <div class="pr-stat-val ${s.avgDist === null ? 'muted' : ''}">
                            ${s.avgDist !== null ? s.avgDist.toFixed(2) + ' km' : '—'}
                        </div>
                        <div class="pr-stat-lbl">Avg Distance (wins)</div>
                    </div>
                    <div class="pr-stat-cell">
                        <div class="pr-stat-val ${s.bestAttempts === null ? 'muted' : ''}">
                            ${s.bestAttempts !== null ? s.bestAttempts + (s.bestAttempts === 1 ? ' attempt' : ' attempts') : '—'}
                        </div>
                        <div class="pr-stat-lbl">Fewest Attempts</div>
                    </div>
                    <div class="pr-stat-cell">
                        <div class="pr-stat-val ${s.avgAttempts === null ? 'muted' : ''}">
                            ${s.avgAttempts !== null ? s.avgAttempts.toFixed(1) : '—'}
                        </div>
                        <div class="pr-stat-lbl">Avg Attempts (wins)</div>
                    </div>
                </div>
            </div>`;
    }).join('');

    document.getElementById('pr-content').innerHTML = `
        ${heroHtml}
        ${overallHtml}
        <div class="pr-section-lbl anim anim-d3">Performance by Difficulty</div>
        <div class="pr-diff-cards anim anim-d4">${diffCardsHtml}</div>`;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

initMySession().then(() => loadProfile());
