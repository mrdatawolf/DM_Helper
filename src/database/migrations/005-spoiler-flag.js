module.exports = {
    up(db) {
        const shadowCols = new Set(db.prepare('PRAGMA table_info(shadows)').all().map(c => c.name));
        if (!shadowCols.has('is_spoiler')) {
            db.prepare('ALTER TABLE shadows ADD COLUMN is_spoiler BOOLEAN DEFAULT 0').run();
        }

        const npcCols = new Set(db.prepare('PRAGMA table_info(npcs)').all().map(c => c.name));
        if (!npcCols.has('is_spoiler')) {
            db.prepare('ALTER TABLE npcs ADD COLUMN is_spoiler BOOLEAN DEFAULT 0').run();
        }
    }
};
