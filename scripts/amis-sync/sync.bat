@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
cd /d C:\Users\PC\Desktop\CRM\BikeForce-Bicycle-Sales-Management

echo ============================================================
echo   AMIS SYNC - %date% %time%
echo ============================================================

echo.
echo [1/4] Lay token MISA...
call npx tsx scripts/amis-sync/amis-harvest.ts
if errorlevel 1 (
  echo [%date% %time%] HARVEST FAIL >> scripts\amis-sync\sync.log
  echo.
  echo *** HARVEST THAT BAI - dung lai ***
  timeout /t 15
  exit /b 1
)

echo.
echo [2/4] Dashboard 7 - doanh so da ghi...
python scripts/amis-sync/fetch_dashboard7.py

echo.
echo [3/4] Report 119 - khach hang theo NVKD...
python scripts/amis-sync/fetch_report119.py

echo.
echo [4/4] Cong no da thu...
python scripts/amis-sync/fetch_receivable.py

echo.
echo ============================================================
echo   HOAN TAT - %time%
echo ============================================================
echo [%date% %time%] DONE >> scripts\amis-sync\sync.log
timeout /t 10
