# AGENT E — Alerting System

## Alert Triggers

### CRITICAL (must alert immediately)
1. **Pipeline failure**: 3 consecutive failed runs → Slack/Email
2. **Database unavailable**: ConnectionError → Slack/Email
3. **API outage**: Health check fails → PagerDuty

### HIGH (alert within 30 min)
1. **Stale data**: DataFreshnessMonitor reports critical → Slack
2. **No predictions generated today**: 0 records for today's date → Slack
3. **Validation backlog**: >100 pending predictions past horizon → Slack

### MEDIUM (daily digest)
1. Daily pipeline run report (created/validated/skipped/errors)
2. Trust metrics summary (hit rate, Sharpe, calibration)
3. Data freshness status across all tables

## Implementation Channels
- **Email**: SMTP via nodemailer or SendGrid
- **Slack**: Webhook URL configured via env var
- **Discord**: Webhook URL (optional)

## Config
```env
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
ALERT_EMAIL_TO=team@stockstory.in
ALERT_EMAIL_FROM=alerts@stockstory.in
```
