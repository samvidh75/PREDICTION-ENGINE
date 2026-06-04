# Analytics Implementation Plan

This plan outlines the event schemas and user action trackers recommended to audit engagement during the StockStory Closed Beta.

---

## 1. Tracked Events & Mappings

| Event Name | Trigger Context | Payload Fields |
| :--- | :--- | :--- |
| `signup_completed` | User successfully registers account. | `uid`, `method` (email / google), `timestamp` |
| `login_completed` | User logs into active session. | `uid`, `timestamp` |
| `dashboard_viewed` | Main dashboard terminal loads. | `uid`, `device_type` (desktop / mobile) |
| `company_page_opened` | User opens stock booklet view. | `uid`, `symbol`, `duration_ms` |
| `watchlist_created` | User saves a new watchlist. | `uid`, `watchlist_id`, `ticker_count` |
| `portfolio_created` | User updates portfolio weights. | `uid`, `position_count`, `average_quality_factor` |
| `alert_created` | Alert triggered or added. | `uid`, `alert_type`, `timestamp` |

---

## 2. Telemetry Middleware Layer
All trackers will pipe to a centralized analytics reporter, executing non-blocking background queries to Firebase Analytics / Mixpanel endpoints. No personal data or credentials will be logged.
