// Unify duplicate character columns on the player-facing names.
// Historically the DB used DM-era names (class, max_hit_points, has_pattern_imprint, ...)
// while the player dashboard and API used newer names (class_type, max_hp, pattern_imprint, ...).
// Data lived only in the DM-era columns; the player names mostly didn't exist as columns.
// This migration renames the DM-era columns to the player names, after copying
// race -> species for rows where species is empty (both columns existed).

function columnExists(db, table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

function up(db) {
    // Fresh databases created from the updated schema.sql already use the new names.
    if (!columnExists(db, 'characters', 'race')) return;

    // species existed alongside race: player value wins, fill gaps from race
    db.prepare(`
        UPDATE characters SET species = race
        WHERE (species IS NULL OR species = '') AND race IS NOT NULL
    `).run();
    db.prepare('ALTER TABLE characters DROP COLUMN race').run();

    const renames = [
        ['class', 'class_type'],
        ['max_hit_points', 'max_hp'],
        ['current_hit_points', 'current_hp'],
        ['order_chaos_balance', 'order_chaos_value'],
        ['has_pattern_imprint', 'pattern_imprint'],
        ['has_logrus_imprint', 'logrus_imprint'],
        ['has_trump_artistry', 'trump_artist'],
    ];

    for (const [from, to] of renames) {
        if (columnExists(db, 'characters', from) && !columnExists(db, 'characters', to)) {
            db.prepare(`ALTER TABLE characters RENAME COLUMN "${from}" TO "${to}"`).run();
        }
    }
}

module.exports = { up };
