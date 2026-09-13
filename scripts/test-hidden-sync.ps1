$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$testDirectory = Join-Path $root 'logs/hidden-sync-test'
New-Item -ItemType Directory -Path $testDirectory -Force | Out-Null
$fixture = Join-Path $testDirectory 'fixture.bat'
$driver = Join-Path $testDirectory 'driver.ps1'
$marker = Join-Path $testDirectory 'telegram.log'
$wrapper = Join-Path $PSScriptRoot 'sync-all-reports-hidden.ps1'
# Override only the HTTP call in a child PowerShell: no real Telegram messages.
$driverText = @'
param($Wrapper, $Fixture, $Marker)
$env:TELEGRAM_BOT_TOKEN = 'fixture-secret-token'
$env:TELEGRAM_CHAT_ID = '123'
function Invoke-RestMethod {
    param($Uri, $Method, $ContentType, $Body, $TimeoutSec)
    $payload = [Text.Encoding]::UTF8.GetString($Body) | ConvertFrom-Json
    if ($payload.text -notmatch 'BikeForce - Auto Sync Reports' -or $payload.text -notmatch 'Time:') { throw 'Missing task metadata' }
    if ($payload.text.Contains('fixture-secret-token')) { throw 'Secret leaked' }
    [IO.File]::AppendAllText($Marker, $payload.text + "`n")
    return @{ ok = $true }
}
& $Wrapper -BatchPath $Fixture
exit $LASTEXITCODE
'@
[IO.File]::WriteAllText($driver, $driverText)
if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker }
[IO.File]::WriteAllText($fixture, "@echo off`r`necho success`r`nexit /b 0`r`n")
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $driver $wrapper $fixture $marker
if ($LASTEXITCODE -ne 0 -or (Test-Path -LiteralPath $marker)) { throw 'Success must return 0 and send no Telegram.' }
[IO.File]::WriteAllText($fixture, "@echo off`r`necho fixture-secret-token error 1>&2`r`nexit /b 7`r`n")
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $driver $wrapper $fixture $marker
if ($LASTEXITCODE -ne 7 -or -not (Test-Path -LiteralPath $marker)) { throw 'Failure must preserve exit 7 and send alert.' }
if ((Get-Content -LiteralPath $marker -Raw) -notmatch '\[REDACTED\] error') { throw 'Error must be redacted and included.' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $driver $wrapper (Join-Path $testDirectory 'missing.bat') $marker
if ($LASTEXITCODE -ne 1) { throw 'Exception must return 1.' }
if (([regex]::Matches((Get-Content -LiteralPath $marker -Raw), 'BIKEFORCE SYNC ERROR')).Count -ne 2) { throw 'Expected two error alerts.' }
'PASS: success silent, exit 7 alert with stderr/redaction, exception alert (mock HTTP).'
