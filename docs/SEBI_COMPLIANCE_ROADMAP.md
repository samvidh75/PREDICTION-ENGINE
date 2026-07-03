# SEBI Compliance Roadmap — StockStory India

## Phase 0: Research-First (Current)
No formal recommendations (no Buy/Hold/Sell). Data + explainable analysis only.
Conviction scores = research signal strength, not investment advice.

**User Disclosure:** *"This is research analysis for educational purposes only. Not investment advice."*

## Phase 1: Pre-RA (Q2 2026)
- Document internal control framework
- Implement report approval workflow (manager review before publication)
- Maintain audit trail (who researched, when, what changed)
- Add conflict-of-interest disclosures
- Define research limitations (data lag, sector bias, etc.)

## Phase 2: SEBI RA Registration (Q3 2026)
- NISM qualification for Founder (Research Analyst module)
- Appoint Compliance Officer
- Register as SEBI Research Analyst (Form RACP)
- File research reports with SEBI (if formal recommendations added)
- Annual audit of compliance procedures

## Phase 3: Formal Recommendations (Optional, future)
If StockStory wants to offer "Buy/Hold/Sell" ratings:
- Analyst must be NISM-certified
- Reports must include investment rationale, price targets with methodology, risks disclosed, financial interest disclosures, analyst credentials
- Reports filed with SEBI within 24 hours of publication

## Current UI Compliance

### Header Alert (on /stock/:symbol):
```
ⓘ Research Analysis — Not Investment Advice
This analysis is for educational purposes only.
StockStory is not a registered investment advisor.
Always consult a qualified advisor before investing.
```

### Footer (every report):
```
Data sources: Yahoo Finance, NSE, Upstox, Screener.in
Updated: 2 hours ago
Limitations: Sector bias may exist; check recent news before trading
```

### Broker Handoff Language:
Instead of "Buy TCS" → "Review TCS before investing — [bull/bear case here]"

## Compliance Checklist

| Requirement | Status | Action | Timeline |
|---|---|---|---|
| NISM Certification (RA module) | ❌ | Founder + 1 team member | Q3 2026 |
| Internal Compliance Officer | ❌ | Hire | Q3 2026 |
| Research Approval Process | ❌ | Document review workflow | Q2 2026 |
| Conflict-of-Interest Policy | ❌ | Legal draft | Q2 2026 |
| Disclosure of Limitations | ⚠️ Partial | Add to UI | Q2 2026 |
| No "Buy/Sell/Hold" language | ✅ | Maintained | — |
| Data Source Disclosure | ✅ | In ComplianceBanner | — |
| Audit Trail (all reports) | ❌ | Log to DB | Q2 2026 |
| Rating Scale Definition | ❌ | Define conviction = research score | Q2 2026 |
| Annual Compliance Report | ❌ | Template | Q3 2026 |
