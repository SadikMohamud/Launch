# Windows 1-Line Installer for Launch Video Engine
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  / L A U N C H  · Installing 60fps Video Engine..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta

$targetDir = "$HOME\.launch-engine"
if (Test-Path $targetDir) {
    Write-Host "Updating existing Launch installation..." -ForegroundColor Yellow
    Set-Location $targetDir
    git pull origin main
} else {
    Write-Host "Cloning Launch repository to $targetDir..." -ForegroundColor Yellow
    git clone https://github.com/SadikMohamud/Launch.git $targetDir
    Set-Location $targetDir
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --silent

Write-Host "Registering global 'launch' command..." -ForegroundColor Yellow
npm link --force

Write-Host "`n✓ Launch Engine installed successfully!" -ForegroundColor Green
Write-Host "Run 'launch --help' or 'launch https://yoursite.com' to get started.`n" -ForegroundColor Green
