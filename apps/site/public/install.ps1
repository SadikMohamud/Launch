# Windows 1-Line Installer for Launch Video Engine (Hosted via launch-ouzf.vercel.app)
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  / L A U N C H  · Installing 60fps Video Engine..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta

$targetDir = "$HOME\.launch-engine"
if (-not (Test-Path "$targetDir\bin")) {
    New-Item -ItemType Directory -Force -Path "$targetDir\bin" | Out-Null
}

Write-Host "Downloading Launch Engine binary..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://launch-ouzf.vercel.app/bin/launch.js" -OutFile "$targetDir\bin\launch.js"
Invoke-WebRequest -Uri "https://launch-ouzf.vercel.app/package.json" -OutFile "$targetDir\package.json"

Write-Host "Registering global 'launch' command..." -ForegroundColor Yellow
Set-Location $targetDir
npm link --force

Write-Host "`n✓ Launch Engine installed successfully!" -ForegroundColor Green
Write-Host "Run 'launch --help' or 'launch https://yoursite.com' to get started.`n" -ForegroundColor Green
