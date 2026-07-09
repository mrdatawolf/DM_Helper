// Lightweight toast notifications — drop-in replacement for alert().
// Shared by the DM dashboard and the player portal.

(function () {
    const style = document.createElement('style');
    style.textContent = `
        #toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
            pointer-events: none;
        }
        .toast {
            max-width: 380px;
            padding: 12px 18px;
            border-radius: 8px;
            color: #fff;
            background: rgba(40, 40, 48, 0.95);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
            font-size: 0.92rem;
            line-height: 1.4;
            pointer-events: auto;
            opacity: 0;
            transform: translateY(8px);
            transition: opacity 0.25s ease, transform 0.25s ease;
            border-left: 4px solid #8a7a5a;
        }
        .toast.toast-error   { border-left-color: #e74c3c; background: rgba(60, 28, 24, 0.96); }
        .toast.toast-success { border-left-color: #27ae60; }
        .toast.show { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(style);
}());

function showToast(message, type) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Infer type from message when not given
    if (!type) {
        type = /fail|error|denied|unable|invalid|could not|cannot/i.test(message) ? 'error'
             : /success|saved|created|updated|deleted|granted/i.test(message) ? 'success'
             : 'info';
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.onclick = () => toast.remove();
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
