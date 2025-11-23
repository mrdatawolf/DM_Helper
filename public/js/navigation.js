// Shared Navigation Component

// Initialize navigation
function initNavigation() {
    checkAuthStatus();
    setupMobileMenu();
    highlightCurrentPage();
}

// Check authentication status and update UI
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
        try {
            // Verify token is still valid
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Update localStorage with fresh user data
                localStorage.setItem('user', JSON.stringify(data.user));
                updateNavForUser(data.user);
            } else {
                // Token invalid - just show guest nav, don't clear storage
                // Individual pages will handle redirects if needed
                updateNavForGuest();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // On error, just show guest nav, don't clear storage
            updateNavForGuest();
        }
    } else {
        updateNavForGuest();
    }
}

// Update navigation for authenticated user
function updateNavForUser(user) {
    const role = user.is_dm ? 'dm' : 'player';
    document.body.setAttribute('data-user-role', role);

    const usernameEl = document.querySelector('.nav-username');
    if (usernameEl) {
        usernameEl.textContent = user.username;
    }
}

// Update navigation for guest
function updateNavForGuest() {
    document.body.setAttribute('data-user-role', 'guest');
}

// Handle logout
async function handleNavLogout() {
    const token = localStorage.getItem('token');

    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to landing page
    window.location.href = '/';
}

// Setup mobile menu toggle
function setupMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');

            // Update icon
            const icon = toggle.textContent;
            toggle.textContent = icon === '☰' ? '✕' : '☰';
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.textContent = '☰';
            });
        });
    }
}

// Highlight current page in navigation
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        // Check if current page matches
        if (href === currentPath ||
            (currentPath === '/' && href === '/') ||
            (currentPath.includes(href) && href !== '/')) {
            link.classList.add('active');
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}
