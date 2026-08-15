// Seeds the District 5 shadow and its initial, character-unassigned story arc.
// Both records are matched by their stable names so this is safe to run against
// development and production databases without creating duplicates.

function up(db) {
    const shadowOwnerColumn = db.prepare('PRAGMA table_info(shadows)').all()
        .some(column => column.name === 'created_by');
    const owner = shadowOwnerColumn
        ? db.prepare(`SELECT id FROM users WHERE username = 'mrdatawolf'`).get()
        : null;

    db.prepare(`
        INSERT INTO shadows (
            name, description, order_level, chaos_level, dream_level,
            pattern_influence, corruption_status, is_starting_shadow
            ${shadowOwnerColumn ? ', created_by' : ''}
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?
            ${shadowOwnerColumn ? ', ?' : ''}
        WHERE NOT EXISTS (SELECT 1 FROM shadows WHERE name = ?)
    `).run(
        'District 5',
        'A failing modern America preserves national unity through the National Surrender Program: monthly, state-broadcast death games in which roughly thirty recent graduates from the same community are sent to an erased Pacific Northwest island. Adults must watch while children are forbidden to know. Beneath its mundane cruelty, District 5 is a shadow of pathological Order, where procedure has replaced justice and collective duty has become collective complicity.',
        94,
        6,
        0,
        'Pattern',
        'Pathological Order — ritualized control, compulsory spectatorship, and procedural equality severed from justice',
        1,
        ...(shadowOwnerColumn ? [owner?.id || null] : []),
        'District 5'
    );

    db.prepare(`
        INSERT INTO story_arcs (
            character_id, title, theme, description, status, dm_notes, order_index
        )
        SELECT NULL, ?, ?, ?, 'planned', ?,
               COALESCE((SELECT MAX(order_index) + 1 FROM story_arcs WHERE character_id IS NULL), 0)
        WHERE NOT EXISTS (SELECT 1 FROM story_arcs WHERE title = ?)
    `).run(
        'What We Surrender',
        'Complicity, coerced sacrifice, and the freedom to imagine another future',
        'A recent graduate is selected for a monthly Surrender and awakens with roughly thirty classmates on District 5. Over three days, collars, forbidden zones, and the state\'s deadline turn lifelong relationships into instruments of control. Morrí watches the student\'s choices in the form of a crow. At the final moment, as someone personally important is about to kill them, Corwin opens a path out of the shadow.',
        'Leave character_id null until the new player character is created, then attach this arc. Build the contestant roster from the character\'s backstory before outlining the first episode. The central relationship is the person about to kill the character when Morrí chooses them and Corwin intervenes. The collar crosses the portal and remains locked around the character\'s neck. District 5 declares the vanished student dead rather than acknowledge an impossible escape. Full setting reference: Shadow Lore/District 5.md.',
        'What We Surrender'
    );
}

module.exports = { up };

