# Security Headers & CORS — Part 12

## CORS (already configured)

**File:** `src/render/startServer.ts`

Allowed origins:
- `https://stockstory-india.com`
- `https://www.stockstory-india.com`
- `SELF_ORIGIN` (default: `https://stockstory-api.onrender.com`)
- `EXTRA_ALLOWED_ORIGINS` env var (comma-separated)

`credentials: true` — allows cookies/auth headers.

## Security Headers (added in this phase)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `0` | Disables legacy XSS filter (safer) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused permissions |

## Not Applied (future)

- `Content-Security-Policy` — Complex to configure for SPA with multiple CDN resources; defer to CSP Phase
- `Strict-Transport-Security` — Should be configured at the reverse proxy/CDN level (Vercel/Render handle this)
