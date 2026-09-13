param(
    [string]$BatchPath = (Join-Path $PSScriptRoot 'sync-all-reports.bat'),
    [switch]$NoTelegram
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$logDirectory = Join-Path $projectRoot 'logs'
$logPath = Join-Path $logDirectory 'auto-sync.log'
$taskName = 'BikeForce - Auto Sync Reports'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$exitCode = 1
$lock = $null
$process = $null
$detail = ''
$secrets = @{}
if ($env:TELEGRAM_BOT_TOKEN) { $secrets['TELEGRAM_BOT_TOKEN'] = $env:TELEGRAM_BOT_TOKEN }

function Protect-Text([string]$value) {
    foreach ($secret in $secrets.Values) {
        if ($secret -and $secret.Length -ge 6) { $value = $value.Replace($secret, '[REDACTED]') }
    }
    $value = $value -replace '(?i)Bearer\s+[A-Za-z0-9._~+/-]+', 'Bearer [REDACTED]'
    return ($value -replace 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED JWT]')
}

function Write-Log([string]$value) {
    [System.IO.File]::AppendAllText($logPath, ((Protect-Text $value) + [Environment]::NewLine), $utf8)
}

try {
    [System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null
    # File handle is released by Windows even if the wrapper is terminated.
    try {
        $lock = [System.IO.File]::Open((Join-Path $logDirectory 'auto-sync.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch [System.IO.IOException] {
        if (($_.Exception.HResult -band 0xFFFF) -eq 32) { exit 0 }
        throw
    }

    foreach ($envFile in @((Join-Path $projectRoot '.env.local'), (Join-Path $PSScriptRoot 'amis-sync/.env'))) {
        if (Test-Path -LiteralPath $envFile) {
            foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
                if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                    $name = $Matches[1]
                    $value = $Matches[2].Trim().Trim('"').Trim("'")
                    if ($name -match 'TOKEN|KEY|COOKIE|PASSWORD|SECRET|CONTEXT|DEVICE') { $secrets[$envFile + ':' + $name] = $value }
                    if ($name -in @('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID') -and -not [Environment]::GetEnvironmentVariable($name)) {
                        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
                    }
                }
            }
        }
    }

    Write-Log "[$(Get-Date -Format o)] START $taskName"
    if (-not (Test-Path -LiteralPath $BatchPath -PathType Leaf)) { throw 'Batch script does not exist.' }
    if ($BatchPath.Contains('"')) { throw 'Invalid batch path.' }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $env:ComSpec
    $info.Arguments = '/d /s /c ""' + [System.IO.Path]::GetFullPath($BatchPath) + '""'
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = $utf8
    $info.StandardErrorEncoding = $utf8
    # The wrapper sends one task-level alert; suppress nested AMIS alerts.
    $info.EnvironmentVariables['BIKEFORCE_TASK_ALERT_OWNER'] = 'wrapper'
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    if (-not $process.Start()) { throw 'Could not start sync process.' }
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    $exitCode = $process.ExitCode
    $output = $stdout.GetAwaiter().GetResult()
    $errorOutput = $stderr.GetAwaiter().GetResult()
    Write-Log "STDOUT:`n$output"
    Write-Log "STDERR:`n$errorOutput"
    $detail = "STDOUT:`n$output`nSTDERR:`n$errorOutput"
    Write-Log "[$(Get-Date -Format o)] END $taskName exit=$exitCode"
} catch {
    $exitCode = 1
    $detail = $_.Exception.Message
    try { Write-Log "[$(Get-Date -Format o)] EXCEPTION $taskName`: $detail" } catch { }
} finally {
    if ($process) { $process.Dispose() }
}

try {
    if ($exitCode -ne 0 -and -not $NoTelegram) {
        if (-not $env:TELEGRAM_BOT_TOKEN -or -not $env:TELEGRAM_CHAT_ID) { throw 'Telegram configuration missing.' }
        $detail = Protect-Text $detail
        if ($detail.Length -gt 3200) { $detail = '[Log tail] ' + $detail.Substring($detail.Length - 3200) }
        $message = "BIKEFORCE SYNC ERROR`nTime: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')`nTask: $taskName`nExit: $exitCode`n$detail"
        $body = @{ chat_id = $env:TELEGRAM_CHAT_ID; text = $message } | ConvertTo-Json -Compress
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $response = Invoke-RestMethod -Uri ('https://api.telegram.org/bot' + $env:TELEGRAM_BOT_TOKEN + '/sendMessage') -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 15
        if (-not $response.ok) { throw 'Telegram rejected the alert.' }
        Write-Log "[$(Get-Date -Format o)] Telegram alert sent."
    }
} catch {
    # Do not log HTTP exception URLs: they contain the bot token.
    try { Write-Log "[$(Get-Date -Format o)] Telegram alert failed; check configuration/network. Original exit=$exitCode" } catch { }
} finally {
    if ($lock) { $lock.Dispose() }
}
exit $exitCode
