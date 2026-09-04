param(
  [ValidateRange(15, 1440)]
  [int]$IntervalMinutes = 60
)

$ErrorActionPreference = "Stop"
$taskName = "BikeForce - Auto Sync Reports"
$runnerPath = (Resolve-Path (Join-Path $PSScriptRoot "sync-all-reports.bat")).Path
$cmdPath = Join-Path $env:SystemRoot "System32\cmd.exe"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$actionArgument = "/d /c " + [char]34 + $runnerPath + [char]34

$action = New-ScheduledTaskAction `
  -Execute $cmdPath `
  -Argument $actionArgument `
  -WorkingDirectory (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$principal = New-ScheduledTaskPrincipal `
  -UserId $currentUser `
  -LogonType Interactive `
  -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Auto sync AMIS revenue, AMIS calls and SaleWork for BikeForce." `
  -Force | Out-Null

Write-Host "Installed $taskName. It runs every $IntervalMinutes minutes while $currentUser is signed in."
Write-Host "First run: $($trigger.StartBoundary)"
Write-Host "Run now: Start-ScheduledTask -TaskName `"$taskName`""
