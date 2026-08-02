# Analyst Workflow Architecture

## Overview

The Autonomous Analyst Desk sits on top of StockStory's intelligence engine and data moat. It produces research-only outputs: analyst briefs, deep dives, results notes, sector briefs, and evidence-bound Q&A.

## Pipeline

1. **Task** — AnalystTaskRunner receives typed tasks (filing_review, earnings_review, etc.)
2. **Workflow** — ResearchWorkflowOrchestrator loads context, builds evidence map, runs generators
3. **Generate** — Deterministic generators produce drafts (LLM optional, not required)
4. **Validate** — AnalystOutputValidator + forbidden language checks
5. **Confidence** — AnalystConfidenceScorer + AnalystEscalationEngine decide publish path
6. **Review** — ResearchReviewQueue for low-confidence or governance-sensitive output
7. **Audit** — ResearchAuditTrailService records internal lineage
8. **Publish** — Public API routes return sanitized product-facing output

## No-GPU production policy

- Deterministic path works without LLM
- Optional LLM is cache/rate-limited when configured
- Ollama/SGLang/GPU not required in production

## Components

```
src/stockstory/analyst/
├── tasks/          Task framework
├── workflows/      Orchestrator + planner
├── filings/        Filing-to-thesis
├── earnings/       Results notes
├── sector/         Sector briefs
├── company/        Deep dives
├── watchlist/      Review briefs
├── qa/             Research Q&A
├── evidence/       Evidence-bound answers
├── memos/          Analyst memos
├── review/         Human-in-the-loop queue
├── confidence/     Scoring + escalation
├── audit/          Audit trail
├── validation/     Output safety
└── api/            Fastify routes
```
