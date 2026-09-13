(function campaignBrandingModule(global) {
    const neutral = Object.freeze({
        name: 'DM Helper',
        system_label: null,
        universe_label: null,
        branding: Object.freeze({
            tagline: 'A campaign management hub for game masters and players',
            description: 'Organize characters, sessions, storylines, and shared campaign activity in one place.',
            dmPortalDescription: 'Manage campaigns, characters, sessions, progress, and storylines.',
            playerPortalDescription: 'Create and manage characters, follow sessions, and stay connected with your party.',
            footer: 'Campaign management for game masters and players'
        })
    });

    let current = neutral;
    let loadPromise;

    function pageTitle(page, campaign) {
        const suffix = campaign === neutral ? 'DM Helper' : campaign.name;
        const prefixes = {
            home: '',
            guide: "Player's Guide",
            dm: 'DM Dashboard',
            player: 'Player Dashboard',
            admin: 'User Management',
            login: 'Player Login'
        };
        const prefix = prefixes[page];
        return prefix ? `${prefix} — ${suffix}` : suffix;
    }

    function apply(campaign) {
        current = campaign || neutral;
        const branding = current.branding || neutral.branding;
        const universe = current.universe_label;
        const subtitle = current === neutral
            ? 'Campaign Management'
            : `${universe ? `${universe} ` : ''}Campaign Management`;
        const values = {
            'campaign-name': current.name,
            'campaign-subtitle': subtitle,
            'campaign-context': current === neutral ? 'No campaign selected' : current.name,
            'campaign-tagline': branding.tagline || neutral.branding.tagline,
            'campaign-about-heading': current === neutral ? '✨ What is DM Helper?' : `✨ What is ${current.name}?`,
            'campaign-description': branding.description || neutral.branding.description,
            'campaign-dm-description': branding.dmPortalDescription || neutral.branding.dmPortalDescription,
            'campaign-player-description': branding.playerPortalDescription || neutral.branding.playerPortalDescription,
            'campaign-footer': current === neutral ? neutral.branding.footer : `${current.name} • ${branding.footer || subtitle}`
        };
        Object.entries(values).forEach(([key, value]) => {
            document.querySelectorAll(`[data-${key}]`).forEach(element => { element.textContent = value; });
        });
        document.querySelectorAll('[data-campaign-logo]').forEach(element => {
            const logo = current === neutral ? null : branding.logo;
            element.hidden = !logo;
            if (logo) {
                element.src = logo;
                element.alt = current.name;
            } else {
                element.removeAttribute('src');
                element.alt = '';
            }
        });
        const page = document.documentElement.dataset.brandPage;
        if (page) document.title = pageTitle(page, current);
        document.documentElement.dataset.campaignState = current === neutral ? 'none' : 'active';
    }

    async function load() {
        if (!loadPromise) loadPromise = (async () => {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            try {
                const response = await fetch('/api/auth/campaigns', { headers });
                if (!response.ok) return neutral;
                const data = await response.json();
                return data.campaigns.find(campaign => campaign.id === data.current_campaign_id) || neutral;
            } catch (error) {
                console.error('Campaign branding load failed:', error);
                return neutral;
            }
        })();
        apply(await loadPromise);
        return current;
    }

    global.CampaignBranding = Object.freeze({ load, apply, applyCurrent: () => apply(current), neutral });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
})(globalThis);
