@echo off
setlocal enabledelayedexpansion
title DM Helper — Startup

echo.
echo  ==========================================
echo    DM Helper ^| Pre-flight Check
echo  ==========================================
echo.

REM ── 1. Node.js installed? ──────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [FAIL] Node.js not found.
    echo         Install it from https://nodejs.org then try again.
    goto :abort
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo  [OK]   Node.js !NODE_VER!

REM ── 2. node_modules present? ───────────────────────────────────
if not exist "node_modules\" (
    echo  [WARN] node_modules not found — running npm install...
    call npm install
    if errorlevel 1 (
        echo  [FAIL] npm install failed.
        goto :abort
    )
    echo  [OK]   Dependencies installed.
) else (
    echo  [OK]   node_modules present.
)

REM ── 3. .env file present? ──────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        echo  [WARN] .env not found — copying from .env.example...
        copy ".env.example" ".env" >nul
        echo  [WARN] Edit .env and set ADMIN_PASSWORD, then re-run.
        goto :abort
    ) else (
        echo  [FAIL] .env is missing and no .env.example to copy from.
        goto :abort
    )
)
echo  [OK]   .env present.

REM ── 4. Parse .env ──────────────────────────────────────────────
set PORT=3000
set DB_PATH=dm_helper.db
set ADMIN_PASSWORD=

for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "_k=%%a"
    set "_v=%%b"
    if /i "!_k!"=="PORT"           set PORT=!_v!
    if /i "!_k!"=="DB_PATH"        set DB_PATH=!_v!
    if /i "!_k!"=="ADMIN_PASSWORD" set ADMIN_PASSWORD=!_v!
)

REM ── 5. ADMIN_PASSWORD set and not placeholder? ─────────────────
if "!ADMIN_PASSWORD!"=="" (
    echo  [FAIL] ADMIN_PASSWORD is not set in .env
    goto :abort
)
if "!ADMIN_PASSWORD!"=="a_password_here" (
    echo  [FAIL] ADMIN_PASSWORD is still the example placeholder.
    echo         Edit .env and set a real password.
    goto :abort
)
echo  [OK]   ADMIN_PASSWORD is set.

REM ── 6. Database exists? (init if missing) ──────────────────────
REM  Normalise ./path to .\path so Windows exist check works
set "DB_FILE=!DB_PATH:/=\!"

if not exist "!DB_FILE!" (
    echo  [WARN] Database not found at !DB_FILE! — running init-db...
    call node src/database/init-db.js
    if errorlevel 1 (
        echo  [FAIL] Database initialisation failed.
        goto :abort
    )
    echo  [OK]   Database initialised.
) else (
    echo  [OK]   Database found: !DB_FILE!
)

REM ── 7. Port available? ─────────────────────────────────────────
netstat -ano 2>nul | findstr /r ":%PORT%[^0-9]" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [FAIL] Port !PORT! is already in use.
    echo         Stop the process using it or change PORT in .env
    goto :abort
)
echo  [OK]   Port !PORT! is free.

REM ── All clear ──────────────────────────────────────────────────
echo.
echo  ==========================================
echo    All checks passed. Starting server...
echo    http://localhost:!PORT!
echo  ==========================================
echo.

node src/server.js
goto :end

:abort
echo.
echo  ------------------------------------------
echo    Startup aborted. Fix the issues above
echo    and run start.bat again.
echo  ------------------------------------------
echo.
pause

:end
endlocal
