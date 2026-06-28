# Privacy and Data Minimization — Part 12

## Data Collected

| Data Type | Collected? | Storage | Sensitivity |
|-----------|-----------|---------|-------------|
| Email | No | N/A | N/A |
| Phone number | No | N/A | N/A |
| Name | No | N/A | N/A |
| Aadhaar/PAN | No | N/A | N/A |
| Income/Net worth | No | N/A | N/A |
| Bank/Broker credentials | No | N/A | N/A |
| Stock preferences | Yes | localStorage/DB | Low (research-only) |
| Watchlist symbols | Yes | localStorage/DB | Low |
| Research notes/thesis | Yes | localStorage/DB | Low (user-generated) |
| Alert preferences | Yes | localStorage/DB | Low |
| Action history | Yes | localStorage/DB | Low (behavioral) |
| Payment info | No | N/A | N/A |

## Privacy Status

- ✅ **No PII collected** — research preferences are non-identifying
- ✅ **No financial credentials stored** — broker handoff is URL-only (deep link to broker)
- ✅ **No analytics** — analytics events are disabled by default
- ✅ **No cookies** for tracking — only session in localStorage

## Risk Assessment

**Low.** The app stores only stock research preferences (symbols, alerts, thesis notes). None of these constitute personally identifiable information under Indian IT Act or GDPR.

**⚠️ Note:** If Firebase Auth is enabled in the future, email and display name will be stored. A privacy policy update and data processing agreement will be needed.

## Recommendations

1. Add a privacy policy page before enabling auth (mention: data stored, retention, deletion)
2. Add a data export/delete mechanism before auth goes live
3. Consider adding a data retention sweep for unused thesis/action records
