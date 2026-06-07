@echo off
setlocal enabledelayedexpansion

set BASE=c:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE

echo ===== SRC DIRECTORIES =====
for /d %%d in (%BASE%\src\*) do (
    set dirname=%%~nxd
    set total=0
    set ts=0
    set tsx=0
    set test=0
    for /r "%%d" %%f in (*) do (
        set /a total+=1
        echo %%f | findstr /r "\.ts$" >nul && set /a ts+=1
        echo %%f | findstr /r "\.tsx$" >nul && set /a tsx+=1
        echo %%f | findstr /r "\.test\.ts$ \.spec\.ts$" >nul && set /a test+=1
    )
    echo !dirname!: total=!total! ts=!ts! tsx=!tsx! test=!test!
)

echo.
echo ===== SCRIPTS =====
set cjs=0
set mjs=0
set tss=0
for %%f in (%BASE%\scripts\*.cjs) do set /a cjs+=1
for %%f in (%BASE%\scripts\*.mjs) do set /a mjs+=1
for %%f in (%BASE%\scripts\*.ts) do set /a tss+=1
echo .cjs: %cjs%
echo .mjs: %mjs%
echo .ts: %tss%

echo.
echo ===== REPORTS =====
set reportsubs=0
for /d %%d in (%BASE%\reports\*) do set /a reportsubs+=1
echo Subdirectories: %reportsubs%