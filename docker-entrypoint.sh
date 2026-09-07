#!/usr/bin/env sh
set -e

DB_PATH="${DB_PATH:-./dm_helper.db}"

if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "a_password_here" ]; then
  echo "[FAIL] ADMIN_PASSWORD must be set to a real value." >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "[INFO] No database at $DB_PATH — running init-db..."
  node src/database/init-db.js
fi

exec "$@"
