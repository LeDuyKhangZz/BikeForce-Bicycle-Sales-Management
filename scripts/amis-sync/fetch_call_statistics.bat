@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8

echo ============================================================
echo   LAY THONG KE CUOC GOI AMIS
echo ============================================================
echo.

python fetch_call_statistics.py %*
set EXIT_CODE=%ERRORLEVEL%

echo.
if not "%EXIT_CODE%"=="0" (
  echo Script gap loi. Xem thong bao phia tren.
) else (
  echo Hoan tat. Ket qua nam trong call_statistics.json
)
echo.
pause

exit /b %EXIT_CODE%
