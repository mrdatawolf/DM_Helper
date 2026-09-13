// Load navigation HTML into page
(async function loadNavigation() {
    try {
        const response = await fetch('/includes/navigation.html');
        const html = await response.text();

        // Insert navigation at the beginning of body
        const navContainer = document.createElement('div');
        navContainer.innerHTML = html;
        document.body.insertBefore(navContainer.firstElementChild, document.body.firstChild);
        if (typeof checkAuthStatus === 'function') checkAuthStatus();

    } catch (error) {
        console.error('Failed to load navigation:', error);
    }
})();
