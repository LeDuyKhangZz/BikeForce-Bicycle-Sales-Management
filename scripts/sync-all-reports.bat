@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0.."
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
set CI=1

echo ============================================================
echo   BIKEFORCE AUTO SYNC - %date% %time%
echo ============================================================
echo.

call npm.cmd run reports:sync
set "SYNC_EXIT_CODE=%ERRORLEVEL%"

if "%SYNC_EXIT_CODE%"=="0" (
  echo [%date% %time%] THANH CONG >> scripts\amis-sync\auto-sync.log
  echo.
  echo Dong bo tat ca bao cao thanh cong.
) else (
  echo [%date% %time%] THAT BAI exit=%SYNC_EXIT_CODE% >> scripts\amis-sync\auto-sync.log
  echo.
  echo Dong bo that bai. Xem scripts\amis-sync\auto-sync.log va alert.log.
)

exit /b %SYNC_EXIT_CODE%
