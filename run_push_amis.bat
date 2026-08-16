@echo off
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
if not exist logs mkdir logs

call npx tsx scripts\amis-sync\amis-harvest.ts
if errorlevel 2 (
    echo [%date% %time%] SESSION DEAD >> logs\amis.log
    exit /b 1
)
if errorlevel 1 (
    echo [%date% %time%] HARVEST FAIL >> logs\amis.log
    exit /b 1
)

python scripts\amis-sync\test_amis_revenue.py       >> logs\amis.log 2>&1
if errorlevel 1 echo [%date% %time%] FAIL: revenue >> logs\amis.log

python scripts\amis-sync\push_amis.py               >> logs\amis.log 2>&1
if errorlevel 1 echo [%date% %time%] FAIL: push >> logs\amis.log

python scripts\amis-sync\test_act_receivable.py     >> logs\amis.log 2>&1
if errorlevel 1 echo [%date% %time%] FAIL: congno >> logs\amis.log

python scripts\amis-sync\test_crm_customer_stats.py >> logs\amis.log 2>&1
if errorlevel 1 echo [%date% %time%] FAIL: custstats >> logs\amis.log
echo [%date% %time%] DONE >> logs\amis.log