# Trendlyne integration

Trendlyne is integrated as an optional widget-based external technical context layer. It is disabled by default and must be enabled through environment variables.

## Railway environment variables

```env
TRENDLYNE_ENABLED=true
TRENDLYNE_BASE_URL=https://trendlyne.com
TRENDLYNE_WIDGET_MODE=iframe
TRENDLYNE_EMBED_ALLOWED=true
TRENDLYNE_CACHE_TTL_SECONDS=43200
```

Only set `TRENDLYNE_API_KEY` if an official API key exists. Do not store keys in the repo.

## Commands

```bash
npm run trendlyne:config
npm run trendlyne:smoke
```

Railway:

```bash
railway run npm run trendlyne:config
railway run npm run trendlyne:smoke
```

## Behavior

- When disabled, public UI omits Trendlyne entirely.
- When enabled and embedding is allowed, stock detail may show a lazy-loaded technical checklist widget.
- API responses return only safe availability and widget URL data.
- Secrets are never printed.
- No fake Trendlyne data is generated.

## Legal/access rules

- Do not scrape restricted Trendlyne pages without written permission.
- Prefer official widgets, permitted embeds, or licensed API access.
- If embedding is not allowed, keep the feature disabled and omit it from public UI.
