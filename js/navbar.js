// ── Shared navbar — injected on every non-game page ──────────
(async function () {
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    const isAuth = page === 'auth';

    const active = (p) => page === p ? ' active' : '';
    const fromParam = encodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');

    const nav = document.createElement('nav');
    nav.id = 'site-nav';
    nav.innerHTML = `
        <div class="nav-inner">
            <a href="index.html"       class="nav-link${active('index')}">Home</a>
            <a href="leaderboard.html" class="nav-link${active('leaderboard')}">Leaderboards</a>
            ${isAuth ? '' : `
            <span class="nav-sep"></span>
            <a href="auth.html?from=${fromParam}"                  class="nav-link${active('profile')}" id="nav-account">Sign In</a>
            <a href="auth.html?tab=register&from=${fromParam}"     class="nav-link" id="nav-action">Register</a>
            `}
        </div>`;

    document.body.prepend(nav);

    // Auth page shows only nav links — no session check needed
    if (isAuth) return;

    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const { data: prof } = await db
        .from('profiles').select('username').eq('id', session.user.id).single();
    if (!prof) return;

    const username = prof.username;

    // "Sign In" → username → links to profile page
    const accountEl = document.getElementById('nav-account');
    accountEl.textContent = username;
    accountEl.href = `profile.html?u=${encodeURIComponent(username)}`;
    if (page === 'profile') accountEl.classList.add('active');
    else accountEl.classList.remove('active');

    // "Register" → "Sign Out"
    const actionEl = document.getElementById('nav-action');
    actionEl.textContent = 'Sign Out';
    actionEl.removeAttribute('href');
    actionEl.classList.add('nav-signout');
    actionEl.addEventListener('click', async () => {
        await db.auth.signOut();
        window.location.href = 'index.html';
    });
}());
