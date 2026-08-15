// Adds a super-admin role (independent of is_dm) and ownership tracking on
// shadows, so a shadow's creator can always edit it, and otherwise only a
// super admin can. Backfills mrdatawolf as super admin and as the owner of
// every pre-existing shadow (none of which had a recorded creator before this).

function up(db) {
    const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
    if (!userCols.has('is_super_admin')) {
        db.prepare('ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0').run();
    }

    const shadowCols = new Set(db.prepare('PRAGMA table_info(shadows)').all().map(c => c.name));
    if (!shadowCols.has('created_by')) {
        db.prepare('ALTER TABLE shadows ADD COLUMN created_by INTEGER').run();
    }

    db.prepare(`UPDATE users SET is_super_admin = 1 WHERE username = 'mrdatawolf'`).run();

    const owner = db.prepare(`SELECT id FROM users WHERE username = 'mrdatawolf'`).get();
    if (owner) {
        db.prepare('UPDATE shadows SET created_by = ? WHERE created_by IS NULL').run(owner.id);
    }
}

module.exports = { up };
