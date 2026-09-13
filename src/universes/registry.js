const amber = require('./amber');

const universes = new Map([[amber.id, amber]]);
const universeCharacterFields = new Set([...universes.values()].flatMap(universe => universe.character.fields));

function getUniverse(id) {
    return id == null || id === '' ? undefined : universes.get(id);
}

function requireUniverse(id) {
    const universe = getUniverse(id);
    if (!universe) throw new Error(`Unknown universe: ${id}`);
    return universe;
}

function getUniverseForCampaign(db, campaignId) {
    const campaign = db.prepare('SELECT universe_id FROM campaigns WHERE id = ?').get(campaignId);
    return campaign ? getUniverse(campaign.universe_id) : undefined;
}

function stripUniverseCharacterFields(character) {
    return Object.fromEntries(Object.entries(character).filter(([field]) => !universeCharacterFields.has(field)));
}

function hydrateCharacterForCampaign(db, campaignId, character) {
    const core = stripUniverseCharacterFields(character);
    const universe = getUniverseForCampaign(db, campaignId);
    return universe ? universe.character.hydrate(db, core, universe) : core;
}

module.exports = {
    getUniverse, requireUniverse, getUniverseForCampaign, hydrateCharacterForCampaign,
    stripUniverseCharacterFields, universeCharacterFields, universes
};
