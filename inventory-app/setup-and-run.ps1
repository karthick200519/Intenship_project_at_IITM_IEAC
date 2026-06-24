<#
  setup-and-run.ps1
  - Checks for Node/npm and installs via winget or chocolatey if missing (requires admin)
  - Installs npm deps, runs seed, and starts the app
  Run as Administrator in PowerShell: `.\
un-docker.ps1` or `.\setup-and-run.ps1`
#>

function Write-Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Err($m){ Write-Host "[ERR] $m" -ForegroundColor Red }

# Ensure running from script directory
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Checking for Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Ok "Node is installed: $(node -v)"
} else {
  Write-Host "Node.js not found. Attempting to install via winget or choco (requires admin)."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Installing Node LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Installing Node LTS via chocolatey..."
    choco install nodejs-lts -y
  } else {
    Write-Err "Neither winget nor choco found. Please install Node.js manually from https://nodejs.org/ and re-run this script."
    exit 1
  }
}

Start-Sleep -Seconds 2
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Err "npm still not found. Please restart your shell or install Node manually."
  exit 1
}

Write-Host "Installing npm dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed."; exit 1 }
Write-Ok "Dependencies installed."

Write-Host "Seeding database..."
npm run seed
if ($LASTEXITCODE -ne 0) { Write-Err "Seeding failed."; exit 1 }
Write-Ok "Database seeded."

Write-Host "Starting server (foreground). Use Ctrl+C to stop."
npm start
