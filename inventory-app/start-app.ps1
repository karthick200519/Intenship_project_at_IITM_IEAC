# start-app.ps1 - helper to detect Node or Docker and start the app
# Usage: powershell -ExecutionPolicy Bypass -File .\start-app.ps1

$cwd = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $cwd

function Start-NodeApp {
    Write-Output "Starting with Node..."
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node is not installed or not in PATH. Install Node LTS from https://nodejs.org/ and retry."
        return
    }
    npm install
    npm start
}

function Start-DockerApp {
    Write-Output "Starting with Docker Compose..."
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed or not in PATH. Install Docker Desktop and retry."
        return
    }
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Output "docker-compose not found, using 'docker compose' if available"
        docker compose up --build
    } else {
        docker-compose up --build
    }
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Start-NodeApp
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    Start-DockerApp
} else {
    Write-Output "Neither Node nor Docker detected. Please install one of them."
}
