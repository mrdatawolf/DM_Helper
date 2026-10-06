function up(db) {
    const columns = new Set(db.prepare('PRAGMA table_info(campaigns)').all().map(column => column.name));
    if (!columns.has('kind')) {
        db.exec("ALTER TABLE campaigns ADD COLUMN kind TEXT NOT NULL DEFAULT 'campaign' CHECK(kind IN ('campaign', 'oneshot'))");
    }
    if (!columns.has('planned_session_limit')) {
        db.exec('ALTER TABLE campaigns ADD COLUMN planned_session_limit INTEGER');
    }
}

module.exports = { up };
