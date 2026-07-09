# Legacy database scripts

These one-off scripts built up the production schema before the migration runner
existed. They are kept for historical reference only — **do not run them**.

The current setup path is:

1. `npm run init-db` — creates a fresh database from `../schema.sql`
2. `npm run migrate` (also runs automatically at server startup) — applies
   everything in `../migrations/` in order, tracked in the `schema_migrations` table

The migrations fully cover what these scripts used to do:
- `001-unify-character-columns.js` — renames legacy column names to the unified set
- `002-expand-character-columns.js` — full character-sheet columns + `users.is_archived`
- `003-feature-tables.js` — journal, story arcs/chapters/beats, session links,
  primal patterns, spells/feats tables (DDL captured from production)
