param(
  [ValidateRange(1, 60)]
  [int]$IntervalMinutes = 1
)

$ErrorActionPreference = "Stop"
$taskName = "BikeForce - Monthly Sync Worker"
$runnerPath = (Resolve-Path (Join-Path $PSScriptRoot "run-monthly-sync-worker.bat")).Path
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cmdPath = Join-Path $env:SystemRoot "System32\cmd.exe"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$actionArgument = "/d /c " + [char]34 + $runnerPath + [char]34

$action = New-ScheduledTaskAction -Execute $cmdPath -Argument $actionArgument -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal `
  -Settings $settings -Description "Process BikeForce monthly AMIS and SaleWork sync requests." -Force | Out-Null

Write-Host "Installed $taskName for $currentUser; polling every $IntervalMinutes minute(s)."
