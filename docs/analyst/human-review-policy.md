# Human Review Policy

## Review triggers

- Low confidence (< 40)
- High materiality filing
- Governance-sensitive claim
- Unsupported claim removed
- Data conflict detected
- Large thesis state change
- Severe risk escalation
- Sensitive question answer
- LLM validation warning

## Review statuses

- `pending_review`, `approved`, `rejected`, `revised`, `auto_published`, `not_publishable`

## Public behavior

- Public output does not wait forever on review
- Limited safe output or unavailable state shown when review pending
- Review metadata is internal-only

## Gating

- Internal routes require `INTERNAL_API_KEY`
- No admin UI required — queue available via internal API and reports
