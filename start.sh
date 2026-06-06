#!/usr/bin/env bash
set -euo pipefail

# ── Helpers ────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e " ${GREEN}[OK]${RESET}   $*"; }
warn() { echo -e " ${YELLOW}[WARN]${RESET} $*"; }
fail() { echo -e " ${RED}[FAIL]${RESET} $*"; }

abort() {
    echo
    echo -e " ${RED}------------------------------------------${RESET}"
    echo -e "  Startup aborted. Fix the issues above"
    echo -e "  and run ./start.sh again."
    echo -e " ${RED}------------------------------------------${RESET}"
    echo
    exit 1
}

echo
echo -e " ${BOLD}==========================================${RESET}"
echo -e "  DM Helper | Pre-flight Check"
echo -e " ${BOLD}==========================================${RESET}"
echo

# ── 1. Node.js installed? ──────────────────────────────────────
if ! command -v node &>/dev/null; then
    fail "Node.js not found."
    echo "        Install it from https://nodejs.org then try again."
    abort
fi
NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

# ── 2. node_modules present? ───────────────────────────────────
if [ ! -d "node_modules" ]; then
    warn "node_modules not found — running npm install..."
    if ! npm install; then
        fail "npm install failed."
        abort
    fi
    ok "Dependencies installed."
else
    ok "node_modules present."
fi

# ── 3. .env file present? ──────────────────────────────────────
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warn ".env not found — copying from .env.example..."
        cp .env.example .env
        warn "Edit .env and set ADMIN_PASSWORD, then re-run."
        abort
    else
        fail ".env is missing and no .env.example to copy from."
        abort
    fi
fi
ok ".env present."

# ── 4. Parse .env ──────────────────────────────────────────────
PORT=3000
DB_PATH="dm_helper.db"
ADMIN_PASSWORD=""

while IFS='=' read -r key val; do
    # Strip comments and blank lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key="${key// /}"
    val="${val%%#*}"          # strip inline comments
    val="${val%"${val##*[![:space:]]}"}"  # rtrim
    case "$key" in
        PORT)           PORT="$val" ;;
        DB_PATH)        DB_PATH="$val" ;;
        ADMIN_PASSWORD) ADMIN_PASSWORD="$val" ;;
    esac
done < .env

# ── 5. ADMIN_PASSWORD set and not placeholder? ─────────────────
if [ -z "$ADMIN_PASSWORD" ]; then
    fail "ADMIN_PASSWORD is not set in .env"
    abort
fi
if [ "$ADMIN_PASSWORD" = "a_password_here" ]; then
    fail "ADMIN_PASSWORD is still the example placeholder."
    echo "        Edit .env and set a real password."
    abort
fi
ok "ADMIN_PASSWORD is set."

# ── 6. Database exists? (init if missing) ──────────────────────
if [ ! -f "$DB_PATH" ]; then
    warn "Database not found at $DB_PATH — running init-db..."
    if ! node src/database/init-db.js; then
        fail "Database initialisation failed."
        abort
    fi
    ok "Database initialised."
else
    ok "Database found: $DB_PATH"
fi

# ── 7. Port available? ─────────────────────────────────────────
if command -v ss &>/dev/null; then
    PORT_CHECK=$(ss -tlnp 2>/dev/null | grep ":$PORT " || true)
elif command -v lsof &>/dev/null; then
    PORT_CHECK=$(lsof -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
else
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep ":$PORT " || true)
fi

if [ -n "$PORT_CHECK" ]; then
    fail "Port $PORT is already in use."
    echo "        Stop the process using it or change PORT in .env"
    abort
fi
ok "Port $PORT is free."

# ── All clear ──────────────────────────────────────────────────
echo
echo -e " ${BOLD}==========================================${RESET}"
echo -e "  All checks passed. Starting server..."
echo -e "  http://localhost:${PORT}"
echo -e " ${BOLD}==========================================${RESET}"
echo

exec node src/server.js
