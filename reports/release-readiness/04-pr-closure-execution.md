# Stale PR Closure Execution

**Date:** 2026-06-15
**Audit ref:** `reports/release-readiness/01-stale-pr-audit.md`

---

## Execution Notes

The `gh` CLI is installed but **not authenticated** on this machine. No `GH_TOKEN` or `GITHUB_TOKEN` environment variable is available. Therefore PR comments and closure must be performed manually via the GitHub web UI.

### PRs to Close (All Verified ABSORBED)

| PR | Title | Head SHA | Comment Posted | Closed |
|----|-------|----------|----------------|--------|
| #15 | F2.1 stock workspace | `6ec0a7f` | ❌ (manual) | ❌ (manual) |
| #16 | F2.2 market dashboard and scanners | `5a2cf14` | ❌ (manual) | ❌ (manual) |
| #17 | F2.3 portfolio operating system | `57303a9` | ❌ (manual) | ❌ (manual) |
| #19 | F3.1A provider request broker core | `878e7e6` | ❌ (manual) | ❌ (manual) |
| #20 | F3.1B provider adapter migration | `4d6704b` | ❌ (manual) | ❌ (manual) |

### Required Manual Action

For each PR, do the following in the GitHub web UI:

1. Navigate to `https://github.com/samvidh75/PREDICTION-ENGINE/pull/<NUMBER>`
2. Add a comment:
   ```
   Closing this draft because its branch has been fully absorbed into current main. Verified by branch comparison in `reports/release-readiness/01-stale-pr-audit.md`: the PR head is an ancestor of `origin/main`, and `git diff --stat origin/main...<head>` has zero output. No unique work remains on this PR branch.
   ```
3. Click **Close pull request**

### Branch Deletion

Do **not** delete branches yet. The remote branches corresponding to these PRs may have already been cleaned up during `git fetch origin --prune`.

---

## API Attempt Log

```
$ gh pr comment 15 --body "..."
To get started with GitHub CLI, please run:  gh auth login
gh not authenticated
$ echo $GH_TOKEN
(empty)
```

**Resolution:** Manual web UI closure required.
