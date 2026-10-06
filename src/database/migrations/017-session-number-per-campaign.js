function up(db) {
    const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'campaign_sessions'").get()?.sql || '';
    if (!/session_number\s+INTEGER\s+NOT\s+NULL\s+UNIQUE/i.test(sql)) return;

    // As in migration 015, disable FK actions outside the rebuild transaction
    // so dropping the parent table cannot cascade into session-owned data.
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    db.pragma('foreign_keys = OFF');
    try {
        db.transaction(() => {
            const sequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'campaign_sessions'").get();
            const objects = db.prepare(`SELECT sql FROM sqlite_master
                WHERE tbl_name = 'campaign_sessions' AND type IN ('index', 'trigger') AND sql IS NOT NULL`).all();
            db.exec(`
                CREATE TABLE campaign_sessions_number_migration (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_number INTEGER NOT NULL,
                    session_date DATE NOT NULL,
                    session_title TEXT,
                    dm_notes TEXT,
                    session_status TEXT DEFAULT 'planned',
                    opening_notes TEXT,
                    mid_notes TEXT,
                    closing_notes TEXT,
                    campaign_id INTEGER REFERENCES campaigns(id),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(campaign_id, session_number)
                );
                INSERT INTO campaign_sessions_number_migration
                    (id, session_number, session_date, session_title, dm_notes,
                     session_status, opening_notes, mid_notes, closing_notes,
                     campaign_id, created_at, updated_at)
                SELECT id, session_number, session_date, session_title, dm_notes,
                    session_status, opening_notes, mid_notes, closing_notes,
                    campaign_id, created_at, updated_at FROM campaign_sessions;
                DROP TABLE campaign_sessions;
                ALTER TABLE campaign_sessions_number_migration RENAME TO campaign_sessions;
            `);
            if (sequence) db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = 'campaign_sessions'").run(sequence.seq);
            for (const object of objects) db.exec(object.sql);
            const violations = db.pragma('foreign_key_check');
            if (violations.length) throw new Error(`Session number migration created ${violations.length} foreign-key violation(s)`);
        })();
    } finally {
        db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
    }
}

module.exports = { up, transactional: false };
