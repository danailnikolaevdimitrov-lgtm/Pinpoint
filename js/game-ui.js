// ── Fullscreen + landscape lock ──────────────────────────────
(function () {
    const fsBtn = document.getElementById('fullscreen-btn');

    function updateIcon() {
        const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fsBtn.innerHTML = inFs ? '&#x2715;' : '&#x26F6;';
        fsBtn.title = inFs ? 'Exit fullscreen' : 'Enter fullscreen';
    }

    async function toggleFullscreen() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const el = document.documentElement;
                if (el.requestFullscreen) {
                    await el.requestFullscreen();
                } else if (el.webkitRequestFullscreen) {
                    await el.webkitRequestFullscreen();
                }
                // Lock orientation to landscape where supported (Android Chrome)
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(function () {});
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            }
        } catch (e) { /* fullscreen blocked (iframe / permissions) — ignore */ }
    }

    fsBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateIcon);
    document.addEventListener('webkitfullscreenchange', updateIcon);

    // Attempt landscape lock on load for Android Chrome (no fullscreen needed)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
    }
}());
