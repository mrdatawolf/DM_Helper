#Requires -Version 7

# Run from wherever — always operate relative to this script's own directory
Set-Location $PSScriptRoot

function Write-Ok   ($msg) { Write-Host " [OK]   $msg" -ForegroundColor Green }
function Write-Warn ($msg) { Write-Host " [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail ($msg) { Write-Host " [FAIL] $msg" -ForegroundColor Red }

function Stop-WithMessage {
    Write-Host ""
    Write-Host " ------------------------------------------" -ForegroundColor Red
    Write-Host "  Startup aborted. Fix the issues above"
    Write-Host "  and run start.ps1 again."
    Write-Host " ------------------------------------------" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host " ==========================================" -ForegroundColor Cyan
Write-Host "   DM Helper | Pre-flight Check"            -ForegroundColor Cyan
Write-Host " ==========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Node.js ─────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Fail "Node.js not found. Install it from https://nodejs.org"
    Stop-WithMessage
}
Write-Ok "Node.js $(node --version)"

# ── 2. node_modules ────────────────────────────────────────────
if (-not (Test-Path 'node_modules')) {
    Write-Warn "node_modules not found — running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed."; Stop-WithMessage }
    Write-Ok "Dependencies installed."
} else {
    Write-Ok "node_modules present."
}

# ── 3. .env file ───────────────────────────────────────────────
if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Write-Warn ".env not found — copying from .env.example..."
        Copy-Item '.env.example' '.env'
        Write-Warn "Edit .env and set ADMIN_PASSWORD, then re-run."
        Stop-WithMessage
    } else {
        Write-Fail ".env is missing and no .env.example to copy from."
        Stop-WithMessage
    }
}
Write-Ok ".env present."

# ── 4. Parse .env ──────────────────────────────────────────────
$cfg = @{ PORT = '3000'; DB_PATH = 'dm_helper.db'; ADMIN_PASSWORD = '' }
Get-Content '.env' | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)') {
        $k = $Matches[1].Trim()
        $v = ($Matches[2] -replace '\s*#.*$', '').Trim()
        if ($cfg.ContainsKey($k)) { $cfg[$k] = $v }
    }
}
$port          = [int]$cfg.PORT
$dbPath        = $cfg.DB_PATH -replace '^\.[\\/]', ''
$adminPassword = $cfg.ADMIN_PASSWORD

# ── 5. ADMIN_PASSWORD ──────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($adminPassword)) {
    Write-Fail "ADMIN_PASSWORD is not set in .env"
    Stop-WithMessage
}
if ($adminPassword -eq 'a_password_here') {
    Write-Fail "ADMIN_PASSWORD is still the example placeholder — set a real password in .env"
    Stop-WithMessage
}
Write-Ok "ADMIN_PASSWORD is set."

# ── 6. Database ────────────────────────────────────────────────
if (-not (Test-Path $dbPath)) {
    Write-Warn "Database not found at $dbPath — running init-db..."
    node src/database/init-db.js
    if ($LASTEXITCODE -ne 0) { Write-Fail "Database initialisation failed."; Stop-WithMessage }
    Write-Ok "Database initialised."
} else {
    Write-Ok "Database found: $dbPath"
}

# ── 7. Port available? ─────────────────────────────────────────
$ipProps = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
$inUse   = $ipProps.GetActiveTcpListeners() | Where-Object Port -eq $port
if ($inUse) {
    Write-Fail "Port $port is already in use. Stop the process or change PORT in .env"
    Stop-WithMessage
}
Write-Ok "Port $port is free."

# ── All clear ──────────────────────────────────────────────────
Write-Host ""
Write-Host " ==========================================" -ForegroundColor Cyan
Write-Host "   All checks passed. Starting server..."   -ForegroundColor Cyan
Write-Host "   http://localhost:$port"                  -ForegroundColor Cyan
Write-Host " ==========================================" -ForegroundColor Cyan
Write-Host ""

node src/server.js

# ── Node exited ────────────────────────────────────────────────
Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Warn "Server stopped cleanly (exit code 0)."
} else {
    Write-Fail "Server exited with code $LASTEXITCODE."
}
