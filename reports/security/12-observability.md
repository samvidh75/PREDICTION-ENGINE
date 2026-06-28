# Observability and Monitoring — Part 12

## Current State

| Component | Status | Detail |
|-----------|--------|--------|
| Fastify logger | ✅ Present | Pino-based (structured JSON logging) |
| Health endpoints | ✅ Present | `/healthz` (DB check), `/readyz` (deep check), `/version` (server info) |
| Error logging | ✅ Present | Global error handler logs all 500 errors with stack traces |
| Request logging | ⚠️ Partial | Fastify logs at `info` level by default |
| Structured logging | ✅ Yes | Pino output is JSON by default |
| Metrics endpoint | ❌ Missing | No Prometheus/metrics endpoint |
| Health check monitoring | ❌ Not configured | No uptime monitoring service configured |
| Alerting | ⚠️ Configured | SLACK_WEBHOOK_URL and DISCORD_WEBHOOK_URL in env but not verified |

## Hardening Applied

1. ✅ Global error handler added (`setErrorHandler`) — logs all 500+ errors with `server.log.error`
2. ✅ Error response sanitization — no stack traces in production responses

## Recommendations

1. Set up UptimeRobot or similar for `/healthz` monitoring
2. Configure Slack/Discord alerting webhooks
3. Add request rate tracking to detect anomalies
4. Add a `/metrics` endpoint for Prometheus if deploying at scale
5. Set `LOG_LEVEL=warn` in production to reduce log volume (default is `info`)
