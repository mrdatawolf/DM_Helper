const { getSystemForCampaign } = require('../../systems/registry');

function sqlTimestamp() {
    return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function activeSystem(req, db) {
    return getSystemForCampaign(db, req.campaign.id);
}

function list(db, req, resource) {
    const system = activeSystem(req, db);
    return system.sheet.readDocument(db, req.params.id)[resource] || [];
}

function create(db, req, resource, values) {
    const system = activeSystem(req, db);
    return system.sheet.mutateDocument(db, req.params.id, data => {
        const rows = data[resource] || (data[resource] = []);
        const row = {
            id: rows.reduce((maximum, item) => Math.max(maximum, Number(item.id) || 0), 0) + 1,
            character_id: Number(req.params.id),
            ...values
        };
        rows.push(row);
        return row;
    });
}

function update(db, req, resource, resourceId, updates) {
    const system = activeSystem(req, db);
    return system.sheet.mutateDocument(db, req.params.id, data => {
        const row = (data[resource] || []).find(item => String(item.id) === String(resourceId));
        if (!row) return undefined;
        Object.assign(row, updates);
        return row;
    });
}

function remove(db, req, resource, resourceId) {
    const system = activeSystem(req, db);
    return system.sheet.mutateDocument(db, req.params.id, data => {
        const rows = data[resource] || [];
        const index = rows.findIndex(item => String(item.id) === String(resourceId));
        if (index < 0) return false;
        rows.splice(index, 1);
        return true;
    });
}

module.exports = { activeSystem, create, list, remove, sqlTimestamp, update };
