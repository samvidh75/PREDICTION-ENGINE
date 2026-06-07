@echo off
cd /d c:\Users\Samvidh\OneDrive\Desktop\STOCKSTORY\PREDICTION-ENGINE

REM Save current remote URL
for /f "tokens=2" %%r in ('git remote get-url origin') do set REMOTE_URL=%%r
echo Remote URL: %REMOTE_URL%

echo === Removing old git history ===
rmdir /s /q .git

echo === Initializing fresh repo ===
git init
git branch -M main
git remote add origin %REMOTE_URL%

echo === Adding all files (respecting .gitignore so DB is excluded) ===
git add -A

echo === Committing ===
git commit -m "chore: clean repository rebuild - all garbage history and large DB file purged"

echo === Force pushing to origin ===
git push --force origin main

echo === Done. Final log: ===
git --no-pager log --oneline -3
