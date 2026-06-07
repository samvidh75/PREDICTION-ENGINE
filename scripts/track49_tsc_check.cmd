@echo off
cd /d "%~dp0.."
echo Running TypeScript type check...
npx tsc -p tsconfig.json --noEmit > tsc_track49_out.txt 2>&1
echo Done. Output saved to tsc_track49_out.txt
type tsc_track49_out.txt
