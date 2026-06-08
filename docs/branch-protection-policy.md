# Branch Protection Policy — StockStory India

**Repository:** samvidh75/PREDICTION-ENGINE
**Track:** TRACK-P3

---

## Recommended Branch Protection Rules

### Main Branch (`main`)

| Rule | Status |
|------|--------|
| Require a pull request before merging | Enabled |
| Require status checks to pass before merging | Enabled |
| Require branches to be up to date before merging | Enabled |
| Require conversation resolution | Enabled |
| Block force pushes | Enabled |
| Block branch deletion | Enabled |
| Require deployment approval | Optional |

### Required Status Checks

The following CI checks must pass before a merge is allowed:

| Check | Workflow | Requirement |
|-------|----------|-------------|
| Typecheck All | CI / typecheck | Must pass |
| Lint | CI / lint | Must pass |
| Unit Tests | CI / unit-tests | Must pass |
| SQLite Integration Tests | CI / integration-tests-sqlite | Must pass |
| PostgreSQL Integration Tests | CI / integration-tests-postgres | Must pass |
| Frontend Build | CI / frontend-build | Must pass |
| Backend Build | CI / backend-build | Must pass |
| Backend Compile | CI / compile-backend | Must pass |
| Schema Contract | CI / schema-contract | Must pass |
| Data Integrity | CI / data-integrity | Must pass |
| Docker Smoke | Docker Smoke / docker-smoke | Must pass |
| Release Gate | Release Gate / release-gate | Must pass (on tag pushes) |

### Code Review

- Require at least one approval
- Require review from code owners (if CODEOWNERS exists)
- Do not allow authors to approve their own PRs

### Emergency Override

In exceptional cases, an admin may bypass branch protection. Document the reason in:
- PR description
- Commit message
- Team communication channel

---

## Implementation

These rules should be configured in:
- GitHub → Repository Settings → Branches → Branch protection rules
- Select `main` as the branch name pattern
- Enable the checks listed above

The CI workflow files that implement the required checks are at:
```
.github/workflows/ci.yml
.github/workflows/docker-smoke.yml
.github/workflows/release-gate.yml
