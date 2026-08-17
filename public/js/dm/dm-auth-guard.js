// dm-auth-guard.js — real session verification + auth-aware fetch for the DM
// dashboard. Loaded first, before dm-core.js and every other DM script.
//
// Two jobs:
//   1. verifyDmSession() replaces the old localStorage-only page guard with a
//      real server check, called from dm-core.js before any data loads.
//   2. A wrapped window.fetch attaches the Bearer token to every /api call
//      (DM fetches otherwise rely solely on the httpOnly cookie) and, on a
//      401, clears the stale session and bounces to the login page — this is
//      the single choke point that stops an expired session from silently
//      corrupting tab data or eating edit/delete clicks.

async function verifyDmSession() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/player-login.html';
        return false;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/player-login.html';
            return false;
        }

        const data = await response.json();
        if (!data.user.is_dm && !data.user.is_admin) {
            showToast('DM access required');
            window.location.href = '/player-dashboard.html';
            return false;
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
    } catch (err) {
        // Network hiccup, not a confirmed-invalid session - don't lock out a
        // real DM over a flaky connection. The server-side requireDM checks
        // on every write remain the actual security boundary.
        console.error('Session check error:', err);
        showToast('Could not verify your session — some actions may fail until this is checked again.');
        return true;
    }
}

(function installAuthAwareFetch() {
    const realFetch = window.fetch.bind(window);
    let sessionExpiredHandled = false;

    window.fetch = async function (input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        const isApiCall = url.startsWith('/api/') || url.startsWith(`${location.origin}/api/`);

        if (isApiCall) {
            const token = localStorage.getItem('token');
            const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
            if (token && !headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            init = { ...init, headers };
        }

        const response = await realFetch(input, init);

        if (isApiCall && response.status === 401 && !sessionExpiredHandled) {
            sessionExpiredHandled = true;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showToast('Your session has expired. Please log in again.');
            setTimeout(() => { window.location.href = '/player-login.html'; }, 1200);
        }

        return response;
    };
})();
