$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SkinScan AI - Local ngrok Deploy     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Building the React Frontend for local serving..." -ForegroundColor Yellow
Set-Location -Path "frontend"

# By setting VITE_API_URL to "/", the built React app will make API calls
# to relative paths (e.g., /auth, /predict) rather than the Render production URL.
# Because FastAPI dynamically serves the React app, relative paths point back to FastAPI!
$env:VITE_API_URL = "/"
npm run build
Set-Location -Path ".."
Write-Host "Frontend build complete!" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Starting the FastAPI backend in a new window..." -ForegroundColor Yellow
# Starts `python app.py` in a separate command prompt window so it keeps running, WITH the virtualenv activated
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title FastAPI Backend && echo Starting FastAPI... && call .venv\Scripts\activate.bat && python app.py" -WindowStyle Normal

Write-Host "[3/3] Starting ngrok on port 8000..." -ForegroundColor Yellow
Start-Sleep -Seconds 3 # Give FastAPI a moment to spin up
ngrok http 8000
