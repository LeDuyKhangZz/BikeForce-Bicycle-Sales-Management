@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0.."
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
set CI=1

call npm.cmd run monthly-sync:worker >> scripts\amis-sync\monthly-sync.log 2>&1
exit /b %ERRORLEVEL%
