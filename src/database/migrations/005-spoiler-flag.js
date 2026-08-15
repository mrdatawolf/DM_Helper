module.exports = {
    up(db) {
        db.prepare('ALTER TABLE shadows ADD COLUMN is_spoiler BOOLEAN DEFAULT 0').run();
        db.prepare('ALTER TABLE npcs ADD COLUMN is_spoiler BOOLEAN DEFAULT 0').run();
    }
};
