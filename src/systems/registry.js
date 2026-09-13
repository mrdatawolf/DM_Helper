const dnd5e = require('./dnd5e');

const systems = new Map([[dnd5e.id, dnd5e]]);

function getSystem(id) {
    return systems.get(id);
}

function requireSystem(id) {
    const system = getSystem(id);
    if (!system) throw new Error(`Unknown system: ${id}`);
    return system;
}

function getSystemForCampaign(db, campaignId) {
    const campaign = db.prepare('SELECT system_id FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) return undefined;
    return requireSystem(campaign.system_id);
}

module.exports = { getSystem, requireSystem, getSystemForCampaign, systems };
