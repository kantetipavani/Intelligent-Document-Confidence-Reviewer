# ==============================================================================
# Intelligent Document Confidence Reviewer - Docker Startup Script
# Automatically resolves port conflicts (e.g. port 3000 / 8000) and starts stack
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Starting Intelligent Document Confidence Reviewer... " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Check and free host port 3000 if occupied by non-Docker process
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3000 }
$portConn = Get-NetTCPConnection -LocalPort $frontendPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }

if ($portConn) {
    foreach ($conn in $portConn) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -and $pidToKill -ne 0) {
            $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -notmatch "com.docker|wslrelay|docker") {
                Write-Host "Found host process '$($proc.ProcessName)' (PID: $pidToKill) on port $frontendPort. Freeing port..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        }
    }
}

# 2. Check and free host port 8000 if occupied by non-Docker process
$backendConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($backendConn) {
    foreach ($conn in $backendConn) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -and $pidToKill -ne 0) {
            $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -notmatch "com.docker|wslrelay|docker") {
                Write-Host "Found host process '$($proc.ProcessName)' (PID: $pidToKill) on port 8000. Freeing port..." -ForegroundColor Yellow
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        }
    }
}

# 3. Check port 27017 (local MongoDB service) and assign MONGO_PORT if busy
$mongoPort = if ($env:MONGO_PORT) { [int]$env:MONGO_PORT } else { 27017 }
$mongoConn = Get-NetTCPConnection -LocalPort $mongoPort -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($mongoConn) {
    $nonDockerMongo = $false
    foreach ($conn in $mongoConn) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill -and $pidToKill -ne 0) {
            $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -notmatch "com.docker|wslrelay|docker") {
                $nonDockerMongo = $true
            }
        }
    }
    if ($nonDockerMongo) {
        Write-Host "Local service detected on port $mongoPort. Mapping container MongoDB to port 27018..." -ForegroundColor Yellow
        $env:MONGO_PORT = "27018"
    }
}

# 4. Launch Docker Compose
Write-Host "Starting Docker containers..." -ForegroundColor Green
docker compose up -d

# 4. Verify running containers
Write-Host ""
Write-Host "Verifying running containers..." -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "Application is ready!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:$frontendPort" -ForegroundColor Green
Write-Host "  - Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor Green
