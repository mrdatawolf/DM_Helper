function up(db) {
    const columns = new Set(
        db.prepare('PRAGMA table_info(characters)').all().map(column => column.name)
    );
    if (!columns.has('image_url')) {
        db.prepare('ALTER TABLE characters ADD COLUMN image_url TEXT').run();
    }
}

module.exports = { up };
