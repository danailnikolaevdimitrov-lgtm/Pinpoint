if (new URLSearchParams(window.location.search).get('tab') === 'register') showTab('register');

// ── Friendly error messages ────────────────────────────────
function friendlyError(msg) {
    if (!msg) return 'Something went wrong. Please try again.';
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials'))       return 'Incorrect email or password.';
    if (m.includes('email not confirmed'))             return 'Please confirm your email before signing in.';
    if (m.includes('user already registered'))        return 'An account with this email already exists.';
    if (m.includes('already registered'))             return 'An account with this email already exists.';
    if (m.includes('password should be at least'))    return 'Password must be at least 8 characters.';
    if (m.includes('unable to validate email') ||
        m.includes('invalid format'))                  return 'Please enter a valid email address.';
    if (m.includes('for security purposes') ||
        m.includes('email rate limit'))                return 'Too many attempts — please wait a moment.';
    if (m.includes('network') || m.includes('fetch')) return 'Network error — check your connection.';
    return 'Something went wrong. Please try again.';
}

// ── Safe redirect target (prevents open-redirect abuse) ───
function safeFrom(from) {
    if (from && /^[a-zA-Z0-9_-]+\.html(\?[^#]*)?$/.test(from)) return from;
    return 'index.html';
}
const _from = safeFrom(new URLSearchParams(window.location.search).get('from'));

// ── Tab switching ─────────────────────────────────────────
function showTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('form-login').style.display    = isLogin ? 'flex' : 'none';
    document.getElementById('form-register').style.display = isLogin ? 'none' : 'flex';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    clearMsg();
}

function showMsg(text, type) {
    const el = document.getElementById('msg');
    el.textContent = text;
    el.className = 'auth-msg ' + type;
}
function clearMsg() {
    const el = document.getElementById('msg');
    el.textContent = '';
    el.className = 'auth-msg';
}

// If already logged in, redirect straight to destination
db.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = _from;
});

// ── Sign In ───────────────────────────────────────────────
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    clearMsg();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error('Sign-in failed. Please try again.');
        showMsg('Signed in! Redirecting…', 'success');
        setTimeout(() => window.location.href = _from, 800);
    } catch (err) {
        showMsg(friendlyError(err.message), 'error');
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// ── Register ──────────────────────────────────────────────
async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-register');
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    clearMsg();

    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    // Check username is not already taken
    const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

    if (existing) {
        showMsg('That username is already taken.', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
    }

    // Create auth user — the DB trigger creates the profile row automatically
    try {
        const { data, error } = await db.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });
        if (error) throw error;
        if (!data.session) throw new Error('Account could not be confirmed. Try signing in instead.');
        showMsg('Account created! Signing you in…', 'success');
        setTimeout(() => window.location.href = _from, 1000);
    } catch (err) {
        showMsg(friendlyError(err.message), 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}
