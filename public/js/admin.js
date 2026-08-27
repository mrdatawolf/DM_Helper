// Admin panel logic

let token = null;
let currentUser = null;
let resetTargetId = null;

function getToken() {
    return localStorage.getItem('token');
}

function authHeader() {
    return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

// Guard: admin only
(function() {
    token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || (!user.is_admin && !user.is_super_admin)) {
        window.location.href = '/player-login.html';
        return;
    }
    currentUser = user;
    document.getElementById('admin-username').textContent = `Logged in as ${user.username}`;
})();

async function adminLogout() {
    try {
        await apiFetch('/api/auth/logout', { method: 'POST', headers: authHeader() });
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/player-login.html';
}

// ── Users ──────────────────────────────────────────────────────

async function loadUsers() {
    try {
        const { users } = await apiFetch('/api/admin/users', { headers: authHeader() });
        renderStats(users);
        renderTable(users);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderStats(users) {
    const active   = users.filter(u => u.username !== 'admin' && !u.is_archived);
    const dms      = active.filter(u => u.is_dm).length;
    const players  = active.filter(u => !u.is_dm).length;
    const archived = users.filter(u => u.username !== 'admin' && u.is_archived).length;

    document.getElementById('stat-total').textContent    = active.length;
    document.getElementById('stat-dm').textContent       = dms;
    document.getElementById('stat-players').textContent  = players;
    document.getElementById('stat-archived').textContent = archived;
}

function renderTable(users) {
    const tbody = document.getElementById('user-table-body');

    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#888;">No users found</td></tr>';
        return;
    }

    const rows = users.map(u => {
        const isAdmin    = u.username === 'admin';
        const isArchived = !!u.is_archived;

        const roleBadge = isAdmin
            ? '<span class="badge-admin">Admin</span>'
            : isArchived
                ? '<span class="badge-archived">Archived</span>'
                : u.is_dm
                    ? '<span class="badge-dm">DM</span>'
                    : '<span class="badge-player">Player</span>';

        const created   = u.created_at  ? fmtDate(u.created_at)  : '—';
        const lastLogin = u.last_login  ? fmtDate(u.last_login)  : 'Never';

        let actions;
        if (isAdmin) {
            actions = '<em style="color:#aaa;font-size:0.8rem;">protected</em>';
        } else if (isArchived) {
            actions = `<div class="action-btns">
                <button class="btn-sm btn-restore" onclick="restoreUser(${u.id}, '${escHtml(u.username)}')">Restore</button>
            </div>`;
        } else {
            actions = `<div class="action-btns">
                ${u.is_dm
                    ? `<button class="btn-sm btn-demote"   onclick="setDM(${u.id}, false)">Remove DM</button>`
                    : `<button class="btn-sm btn-promote"  onclick="setDM(${u.id}, true)">Make DM</button>`}
                <button class="btn-sm btn-reset-pw" onclick="openResetModal(${u.id}, '${escHtml(u.username)}')">Reset PW</button>
                <button class="btn-sm btn-delete"   onclick="archiveUser(${u.id}, '${escHtml(u.username)}')">Archive</button>
            </div>`;
        }

        const rowClass = isArchived ? ' class="row-archived"' : '';

        return `<tr${rowClass}>
            <td><strong>${escHtml(u.username)}</strong></td>
            <td>${escHtml(u.email || '—')}</td>
            <td>${roleBadge}</td>
            <td class="date-cell">${created}</td>
            <td class="date-cell">${lastLogin}</td>
            <td>${actions}</td>
        </tr>`;
    });

    tbody.innerHTML = rows.join('');
}

async function setDM(id, makeDM) {
    try {
        await apiFetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: authHeader(),
            body: JSON.stringify({ is_dm: makeDM })
        });
        showToast(makeDM ? 'DM role granted' : 'DM role removed', 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function archiveUser(id, username) {
    try {
        await apiFetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: authHeader()
        });
        showToast(`"${username}" archived`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function restoreUser(id, username) {
    try {
        await apiFetch(`/api/admin/users/${id}/restore`, {
            method: 'POST',
            headers: authHeader()
        });
        showToast(`"${username}" restored`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ── Password reset modal ───────────────────────────────────────

function openResetModal(id, username) {
    resetTargetId = id;
    document.getElementById('reset-username-label').textContent = username;
    document.getElementById('new-password').value = '';
    document.getElementById('reset-modal').classList.add('open');
    setTimeout(() => document.getElementById('new-password').focus(), 50);
}

function closeResetModal() {
    document.getElementById('reset-modal').classList.remove('open');
    resetTargetId = null;
}

async function submitPasswordReset() {
    const password = document.getElementById('new-password').value;
    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    try {
        await apiFetch(`/api/admin/users/${resetTargetId}/reset-password`, {
            method: 'POST',
            headers: authHeader(),
            body: JSON.stringify({ password })
        });
        showToast('Password reset successfully', 'success');
        closeResetModal();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

document.getElementById('reset-modal').addEventListener('click', function(e) {
    if (e.target === this) closeResetModal();
});

// ── Utilities ─────────────────────────────────────────────────
// escHtml now comes from /js/dom-utils.js (loaded before this file).

function fmtDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

let toastTimer = null;
function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}

// Boot
loadUsers();
