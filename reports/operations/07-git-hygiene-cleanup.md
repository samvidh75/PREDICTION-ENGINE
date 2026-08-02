# Git Hygiene Cleanup

Date: 2026-06-16

## Root Cause

VS Code Source Control was flooded by an untracked local artifact directory:

- `.tmp.driveupload/`

The directory initially contained 46,946 untracked files and used about 914 MB. The files were temporary upload/cache artifacts, including numbered JSON/text/zlib/cache-like files. No tracked source files were modified, and `git diff --stat` was empty before cleanup.

Classification: generated/local agent or upload artifact, not source code.

## Removed Or Ignored

Removed:

- `.tmp.driveupload/` snapshot was removed from the working tree. Some files were read-only and required a chmod/delete pass.

Ignored:

- `.tmp.driveupload/`
- `.turbo/`
- `.vite/`
- `.parcel-cache/`
- `*.log`
- `*.trace`
- `*.zip`
- `task.md`
- `walkthrough.md`
- `implementation_plan.md`

Existing ignores already covered generated directories such as `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, and `test-results/`.

## Intentionally Kept

- `.gitignore`
- `reports/operations/07-git-hygiene-cleanup.md`

No source, test, package, config, database, or migration files were changed as part of this cleanup.

## Verification

Commands run:

- `git status --short`
- `git status --ignored --short | head -200`
- `git diff --stat`
- `git ls-files --others --exclude-standard | head -200`
- `git ls-files --modified | head -200`
- `find . -maxdepth 3 -type d \( -name node_modules -o -name dist -o -name playwright-report -o -name test-results -o -name .cache -o -name .turbo -o -name coverage -o -name .vite -o -name .next -o -name .parcel-cache \) -print`
- `git ls-files | grep -E '(^node_modules/|^dist/|^playwright-report/|^test-results/|^coverage/)'`

Post-cleanup checks:

- `git status --short` showed only `.gitignore` and this report.
- `git diff --stat` showed a small intentional change set.
- `git ls-files --others --exclude-standard | head -100` returned no files.

## Final Status

Final intended tracked changes:

- `.gitignore`
- `reports/operations/07-git-hygiene-cleanup.md`

Commit: `dc9014dc` (`Restore repository hygiene`)
