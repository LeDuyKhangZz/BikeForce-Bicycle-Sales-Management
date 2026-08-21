@echo off
REM ===================================================================
REM  refresh_amis_token.bat
REM  Tu dong lay lai token AMIS (CRM + KE TOAN) va ghi vao .env
REM  Dung de Windows Task Scheduler goi dinh ky (vi du: moi 6 tieng).
REM
REM  LUU Y: script nay KHONG the tu dang nhap lai neu phien trong
REM  .playwright-amis-profile da het han. Khi do no se ghi canh bao
REM  vao scripts\amis-sync\alert.log va ban phai chay tay:
REM     npx tsx scripts/amis-sync/amis-harvest.ts --login
REM ===================================================================

cd /d "C:\Users\PC\Desktop\CRM\BikeForce-Bicycle-Sales-Management"

echo [%date% %time%] Bat dau lay token AMIS... >> scripts\amis-sync\refresh.log

npx tsx scripts/amis-sync/amis-harvest.ts >> scripts\amis-sync\refresh.log 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] THAT BAI - xem alert.log va refresh.log de biet chi tiet >> scripts\amis-sync\refresh.log
) else (
    echo [%date% %time%] Thanh cong. >> scripts\amis-sync\refresh.log
)

exit /b %ERRORLEVEL%