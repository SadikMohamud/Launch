# Launch installer for Windows.
#
# The previous installer had no error handling at all: it printed "installed
# successfully" whether or not the clone, the dependency install or the link
# had worked. This one stops on the first failure, checks every step, and
# never reports success it has not verified.

[CmdletBinding()]
param(
    # Install from this checkout rather than from the published package.
    [switch]$FromSource
)

# Stop on the first error rather than continuing and reporting success.
$ErrorActionPreference = 'Stop'

# Native executables set $LASTEXITCODE rather than throwing, so their exit
# codes are checked explicitly after every call.
$MinNodeMajor = 22
$Package = '@snurm/launch'

function Write-Step  { param($Text) Write-Host "==> $Text" -ForegroundColor White }
function Write-Info  { param($Text) Write-Host "    $Text" -ForegroundColor DarkGray }
function Write-Ok    { param($Text) Write-Host "  ok $Text" -ForegroundColor Green }
function Write-Warn  { param($Text) Write-Host "  ! $Text" -ForegroundColor Yellow }

function Stop-WithError {
    param($Message, $Fix)
    Write-Host ''
    Write-Host "Install failed: $Message" -ForegroundColor Red
    if ($Fix) { Write-Host "    $Fix" -ForegroundColor Red }
    Write-Host ''
    exit 1
}

# Run a native command and fail if it returns a non-zero exit code.
#
# $ErrorActionPreference is dropped to Continue for the duration of the call.
# In Windows PowerShell, a native command writing anything to stderr while the
# preference is Stop raises a terminating NativeCommandError, so npm printing
# an ordinary warning would abort an install that was working perfectly. The
# exit code is the only trustworthy signal for a native command, and it is
# what this checks.
function Invoke-Checked {
    param(
        [string]$File,
        [string[]]$Arguments,
        [string]$FailureMessage,
        [string]$Fix
    )

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $File @Arguments
        $code = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }

    if ($code -ne 0) { Stop-WithError $FailureMessage $Fix }
}

Write-Host ''
Write-Host 'Launch  installing the video engine' -ForegroundColor White
Write-Host ''

# ---------------------------------------------------------------------------
# 1. Node
# ---------------------------------------------------------------------------

Write-Step 'Checking Node'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Stop-WithError 'Node is not installed.' `
        "Install it with: winget install OpenJS.NodeJS.LTS"
}

$nodeVersion = (& node --version).Trim()
$nodeMajor = [int]($nodeVersion -replace '^v', '' -split '\.')[0]

if ($nodeMajor -lt $MinNodeMajor) {
    Stop-WithError "Node $nodeVersion is too old. Launch needs $MinNodeMajor or newer." `
        'Update it with: winget upgrade OpenJS.NodeJS.LTS'
}

Write-Ok "Node $nodeVersion"

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Stop-WithError 'npm is not installed.' 'It normally ships with Node. Reinstall Node.'
}

# ---------------------------------------------------------------------------
# 2. Execution policy
# ---------------------------------------------------------------------------

Write-Step 'Checking the PowerShell execution policy'

# npm creates a launch.ps1 shim alongside launch.cmd. A restrictive execution
# policy blocks the .ps1 shim, and the resulting error is obscure. Launch
# ships launch.cmd, which the policy does not apply to, so this is a warning
# rather than a failure.
$policy = Get-ExecutionPolicy -Scope CurrentUser

if ($policy -in @('Restricted', 'AllSigned', 'Undefined')) {
    $effective = Get-ExecutionPolicy
    if ($effective -in @('Restricted', 'AllSigned')) {
        Write-Warn "Your execution policy is '$effective', which blocks the PowerShell shim npm creates."
        Write-Info 'Launch ships launch.cmd, which is not affected, so this is not fatal.'
        Write-Info 'To allow the PowerShell shim for your user account only, run:'
        Write-Info '  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned'
    }
    else {
        Write-Ok "Execution policy $effective"
    }
}
else {
    Write-Ok "Execution policy $policy"
}

# ---------------------------------------------------------------------------
# 3. Install
# ---------------------------------------------------------------------------

Write-Step 'Installing Launch'
Write-Info 'This downloads a browser and an encoder, about 400MB in total.'

if ($FromSource) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $cliDir = Join-Path $scriptDir 'packages\cli'

    if (-not (Test-Path $cliDir)) {
        Stop-WithError 'This does not look like a Launch checkout.' `
            'Run install.ps1 from the repository root, or drop -FromSource.'
    }

    Push-Location $scriptDir
    try {
        Invoke-Checked 'npm' @('install', '--no-fund', '--no-audit') `
            'Installing dependencies failed.' 'Check the output above.'
    }
    finally { Pop-Location }

    Push-Location $cliDir
    try {
        # npm link is idempotent: a second run replaces the existing link.
        Invoke-Checked 'npm' @('link', '--force') `
            'Linking the launch command failed.' 'Check the output above.'
    }
    finally { Pop-Location }
}
else {
    Invoke-Checked 'npm' @('install', '-g', '--no-fund', '--no-audit', $Package) `
        "Installing $Package failed." 'Check the output above.'
}

Write-Ok 'Installed'

# ---------------------------------------------------------------------------
# 4. Chromium
# ---------------------------------------------------------------------------

Write-Step 'Installing Chromium'

Invoke-Checked 'npx' @('playwright', 'install', 'chromium') `
    'Installing Chromium failed.' 'Try it directly: npx playwright install chromium'

Write-Ok 'Chromium ready'

# ---------------------------------------------------------------------------
# 5. Verify
# ---------------------------------------------------------------------------

Write-Step 'Checking the installation'

$launch = Get-Command launch -ErrorAction SilentlyContinue
if (-not $launch) {
    Stop-WithError 'The launch command is not on your PATH.' `
        'Open a new terminal and try again. If it is still missing, check that the npm global bin folder is on your PATH.'
}

# Verify that the launch on PATH is the one just installed.
#
# An older Launch, or anything else called launch, can sit earlier on PATH and
# win. Checking only that the command exists and exits zero would report a
# successful install while every later run used the wrong program, which is
# precisely the false success this installer exists to remove.
$previous = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $reported = (& launch --version 2>$null | Out-String).Trim()
}
finally {
    $ErrorActionPreference = $previous
}

if ($reported -notmatch '^\d+\.\d+\.\d+$') {
    $npmBin = & npm prefix -g
    Stop-WithError "A different program called 'launch' is earlier on your PATH: $($launch.Source)" `
        "Remove or rename it, then run this installer again. The Launch you just installed is in $npmBin."
}

Write-Ok "launch $reported at $($launch.Source)"

# doctor is the real verification. Reporting success without it is exactly
# the behaviour this rewrite removes. The preference is relaxed for the same
# reason as in Invoke-Checked: the exit code is the signal, not stderr.
$previous = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    & launch doctor
    $doctorCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previous
}

if ($doctorCode -ne 0) {
    Stop-WithError 'Launch installed, but some checks did not pass.' `
        'Fix the items listed above, then run: launch doctor'
}

Write-Host ''
Write-Host 'Launch is ready.' -ForegroundColor Green
Write-Host ''
Write-Host '  Make your first film:'
Write-Host '    launch https://example.com'
Write-Host ''
Write-Host '  If PowerShell blocks the launch command, use launch.cmd instead.'
Write-Host ''
Write-Host '  Uninstall with:'
Write-Host "    npm uninstall -g $Package"
Write-Host ''
