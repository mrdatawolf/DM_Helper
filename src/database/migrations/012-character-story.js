function up(db) {
    const columns = new Set(
        db.prepare('PRAGMA table_info(characters)').all().map(column => column.name)
    );
    if (!columns.has('character_story')) {
        db.prepare('ALTER TABLE characters ADD COLUMN character_story TEXT').run();
    }
}

module.exports = { up };
