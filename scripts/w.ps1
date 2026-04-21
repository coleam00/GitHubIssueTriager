# w.ps1 — PowerShell wrapper for scripts/w.sh.
# Invokes Git Bash directly so `bash` on PATH can't resolve to WSL's bash.
# Usage: .\scripts\w.ps1 <name> [open|rm]

$candidates = @(
  "C:\Program Files\Git\bin\bash.exe",
  "C:\Program Files\Git\usr\bin\bash.exe",
  "C:\Program Files (x86)\Git\bin\bash.exe"
)
$gitBash = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $gitBash) {
  Write-Error "Git Bash not found. Install Git for Windows from https://git-scm.com/download/win"
  exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$wsh = Join-Path $scriptDir "w.sh"

& $gitBash $wsh @args
exit $LASTEXITCODE
