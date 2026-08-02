# Python Runtime — Dockerfile-Managed

**Last updated**: 2026-06-18

## Decision

Python is installed inside the Dockerfile via `apk add` on the `node:22-alpine3.20` base image. No `runtime.txt`, `.python-version`, or separate Python buildpack is used. Railway runs the Dockerfile as-is, so Python is available alongside Node in the same container.

## Dockerfile Changes (This Commit)

| Change | Detail |
|--------|--------|
| Base image | `node:22-alpine3.20` (pinned to Alpine 3.20 for Python 3.12) |
| Python install | `apk add --no-cache python3 py3-pip py3-virtualenv` in runner stage |
| Python version | 3.12.x (Alpine 3.20 ships Python 3.12) |
| Install method | Python venv at `/opt/venv` — **no `--break-system-packages`** |
| PATH | `ENV PATH="/opt/venv/bin:$PATH"` ensures pip from venv |
| Python deps | `COPY requirements-nse.txt` → `pip install -r requirements-nse.txt` (into venv) |
| Version check | `python3 --version` logged during build |
| Fallback | `pip install` failure is non-fatal — `echo` warning, container still starts |

## Why Alpine 3.20

Alpine 3.21+ ships Python 3.14 as default, which is a floating latest version. By pinning to `node:22-alpine3.20`, we get:

- Python 3.12.x (stable, widely tested)
- Full compatibility with `jugaad-data`, `nsepython`, `pandas`
- No PEP 668 `--break-system-packages` requirement (venv handles this)

Node 22 runtime is unchanged — only the Alpine layer is pinned.

## Venv Strategy

Instead of `pip --break-system-packages`, the Dockerfile now:

1. Installs `py3-virtualenv` from Alpine packages
2. Creates `/opt/venv` with `python3 -m venv /opt/venv`
3. Sets `PATH="/opt/venv/bin:$PATH"` as environment variable
4. Installs all Python packages into the venv with standard `pip install`

This is safer, more portable, and avoids PEP 668 system package protection warnings.

## Packages Installed

From `requirements-nse.txt`:

| Package | Purpose |
|---------|---------|
| `jugaad-data` | Bhavcopy CSV, RBI rates, market status, indices |
| `nsepython` | Index quotes, symbol universe, bhavcopy |
| `requests-cache` | HTTP caching for Python-based providers |
| `pandas-market-calendars` | Market calendar utilities |
| `lxml` | XML/HTML parsing |
| `beautifulsoup4` | HTML parsing |

Note: `nselib` has been **removed** from requirements — evaluated and not active.

## Verification

```bash
npm run check:python-runtime
```

This script verifies:
- `python3` is on `$PATH`
- Python version
- `pip` version
- Venv is active (`sys.prefix != sys.base_prefix`)
- Each installed package can be imported and version reported
- `nselib` is reported as `archived_unusable`
