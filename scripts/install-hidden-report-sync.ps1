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
Set-ScheduledTask -TaskName $taskName -TaskPath $task.TaskPath -Action $action -Settings $task.Settings | Out-Null
Get-ScheduledTask -TaskName $taskName -TaskPath $task.TaskPath | Select-Object -ExpandProperty Actions | Format-List Execute, Arguments, WorkingDirectory
"Backup: $backup"
