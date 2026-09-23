@echo off
REM Windows entry point.
REM
REM npm link creates a launch.ps1 shim, which a restrictive PowerShell
REM execution policy refuses to run. This .cmd file is not subject to the
REM execution policy, so it always works. The installer tells the user about
REM it when it detects a policy that would block the PowerShell shim.
node "%~dp0bin\launch.js" %*
