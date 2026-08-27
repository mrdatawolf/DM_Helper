// Shared helper for the "dynamic partial UPDATE" pattern used across several
// routes: given a whitelist of column names and a request body, build the
// SET clause and parameter list for only the fields actually present in the
// body. Never touches Express or a live database connection, so it can be
// unit tested in isolation.

// The field-collection step, exposed separately so a caller with a field
// that needs special handling (e.g. JSON-encoding a column) can layer it on
// top of the shared logic instead of the helper special-casing field names.
function collectUpdateFields(allowedFields, body) {
    const setClauses = [];
    const values = [];
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            setClauses.push(`${field} = ?`);
            values.push(body[field]);
        }
    }
    return { setClauses, values };
}

// Builds a full `UPDATE <table> SET ... WHERE <idColumn> = ?` statement plus
// its bound values, ready to pass to `db.prepare(sql).run(...values)`.
// Returns null when no allowed field was present in the body, so the caller
// can respond with its own (possibly resource-specific) "nothing to update"
// message rather than the helper dictating one.
function buildUpdateQuery(table, allowedFields, body, idValue, options = {}) {
    const { idColumn = 'id', touchUpdatedAt = true } = options;
    const { setClauses, values } = collectUpdateFields(allowedFields, body);

    if (setClauses.length === 0) return null;

    if (touchUpdatedAt) setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(idValue);

    return {
        sql: `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${idColumn} = ?`,
        values,
    };
}

module.exports = { buildUpdateQuery, collectUpdateFields };
