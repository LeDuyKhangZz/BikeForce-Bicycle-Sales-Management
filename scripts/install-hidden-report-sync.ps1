param(
  [ValidateRange(1, 1440)]
  [int]$IntervalMinutes = 10
)

$ErrorActionPreference = 'Stop'
$taskName = 'BikeForce - Auto Sync Reports'
$root = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $PSScriptRoot 'sync-all-reports-hidden.vbs'
$task = Get-ScheduledTask -TaskName $taskName
$backupDirectory = Join-Path $root 'logs'
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backup = Join-Path $backupDirectory ('auto-sync-task-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.xml')
Export-ScheduledTask -TaskName $taskName -TaskPath $task.TaskPath | Set-Content -LiteralPath $backup -Encoding Unicode
$action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32/wscript.exe') -Argument ('//B //NoLogo "' + $launcher + '"') -WorkingDirectory $root
$task.Settings.MultipleInstances = 'IgnoreNew'
$repeatingTriggers = @($task.Triggers | Where-Object { $_.Repetition -and $_.Repetition.Interval })
if ($repeatingTriggers.Count -eq 0) { throw 'Task has no repeating trigger; task was not changed.' }
foreach ($trigger in $repeatingTriggers) { $trigger.Repetition.Interval = "PT${IntervalMinutes}M" }
Set-ScheduledTask -TaskName $taskName -TaskPath $task.TaskPath -Action $action -Settings $task.Settings -Trigger $task.Triggers | Out-Null
Get-ScheduledTask -TaskName $taskName -TaskPath $task.TaskPath | Select-Object -ExpandProperty Actions | Format-List Execute, Arguments, WorkingDirectory
"Backup: $backup"
"Interval: $IntervalMinutes minutes"
