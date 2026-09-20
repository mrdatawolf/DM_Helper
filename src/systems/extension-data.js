function readDocument(db, characterId, system) {
    const row = db.prepare(`
        SELECT data FROM character_extension_data
        WHERE character_id = ? AND namespace = ?
    `).get(characterId, system.namespace);
    if (!row) return undefined;
    return JSON.parse(row.data);
}

function writeDocument(db, characterId, system, document) {
    db.prepare(`
        INSERT INTO character_extension_data (character_id, namespace, data)
        VALUES (?, ?, ?)
        ON CONFLICT(character_id, namespace) DO UPDATE SET
            data = excluded.data,
            updated_at = CURRENT_TIMESTAMP
    `).run(characterId, system.namespace, JSON.stringify(document));
    return document;
}

function mutateDocument(db, characterId, system, mutation) {
    return db.transaction(() => {
        const document = readDocument(db, characterId, system);
        if (!document) throw new Error(`Missing ${system.namespace} data for character ${characterId}`);
        const result = mutation(document);
        writeDocument(db, characterId, system, document);
        return result;
    })();
}

module.exports = { mutateDocument, readDocument, writeDocument };
