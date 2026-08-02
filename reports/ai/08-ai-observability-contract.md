# AI Observability Contract — Phase 9

## Service
Located: `src/stockstory/observability/AiObservability.ts`

## Event Types
| Event | Description |
|-------|-------------|
| `ai.task.started` | Task initiated |
| `ai.task.completed` | Task completed successfully |
| `ai.task.failed_validation` | Output failed schema/policy validation |
| `ai.task.fallback_used` | Fallback provider was used |
| `ai.task.blocked_by_policy` | Output blocked by policy guardrails |

## Tracked Fields
| Field | Type | Description |
|-------|------|-------------|
| taskType | LLMTaskType | generate_thesis, parse_scanner_query, etc. |
| providerMode | LLMGatewayMode | deterministic, disabled, mock |
| latencyMs | number | Execution time in ms |
| validationPassed | boolean | Schema validation result |
| fallbackUsed | boolean | Whether fallback was triggered |
| schemaFailureReason | string? | Reason for schema failure |
| policyFailureReason | string? | Reason for policy failure |
| inputTokenEstimate | number? | Estimated input tokens (future) |
| outputTokenEstimate | number? | Estimated output tokens (future) |
| costEstimate | number? | Estimated cost (null for deterministic) |
| timestamp | string | ISO timestamp |

## Privacy Rules
- Do not log secrets
- Do not log full user portfolio data
- Do not log broker credentials
- Do not expose observability in normal frontend
- Internal/admin only if UI exists

## Current Deterministic-Mode Behavior
- All latencyMs values are <5ms (template-based, no network calls)
- All costEstimate values are 0 (no API costs)
- All validationPassed are true (deterministic output is schema-compliant)
- All fallbackUsed are false (no errors in deterministic mode)

## Future RouteLLM/SGLang Readiness
- Same event schema will work with RouteLLM/SGLang
- latencyMs will capture real model inference time
- costEstimate will track API token costs
- fallback count will track routing fallbacks
- Same privacy rules apply regardless of provider
