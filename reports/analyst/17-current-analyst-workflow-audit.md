# Part 17 — Current Analyst Workflow Audit

| System | Existing files | Current capability | Risk | Gap | Required action |
|--------|----------------|------------------|------|-----|-----------------|
| Research task generation | LLM prompts, intelligence jobs | Ad-hoc research snapshots | No structured task queue | No analyst task types | **Built:** AnalystTaskRegistry/Runner/Store |
| Filing summaries | FilingTypes, FilingImpactMapper | Classification only | No user-facing briefs | No materiality scoring | **Built:** FilingToThesisEngine |
| Earnings/result notes | EarningsEngine, earningsPrompt | Engine scores | No structured results note | No validator | **Built:** EarningsNoteGenerator |
| Company deep dives | CompanyProfileBuilder | Profile data | No deep dive product | No validator | **Built:** CompanyDeepDiveGenerator |
| Sector briefs | SectorEngine, SectorProfileBuilder | Sector scores | No weekly brief | No sector validator | **Built:** SectorBriefGenerator |
| Research Q&A | RAGEngine, LLMExplainer | RAG patterns | Hallucination risk | No classifier/redirect | **Built:** ResearchAnswerEngine |
| Evidence-bound answers | EvidenceTypes, EvidenceCollector | Evidence model | Not wired to Q&A | No citation mapper | **Built:** EvidenceAnswerBuilder |
| Analyst memo exports | CompanyResearchReportBuilder | Generic report | No analyst memo type | No memo builder | **Built:** AnalystMemoBuilder |
| Watchlist review briefs | WatchlistEngine, DigestGenerator | Thesis views | No review brief | No change summary | **Built:** WatchlistReviewBriefGenerator |
| Human review queue | None | None | Unreviewed high-materiality output | No queue | **Built:** ResearchReviewQueue |
| Audit trails | Data lineage types | Partial lineage | No research audit | No workflow audit | **Built:** ResearchAuditTrailService |
| Confidence/escalation | ResearchConfidence | Product confidence | No escalation policy | No publish decision | **Built:** AnalystEscalationEngine |
| Report builder | CompanyResearchReportBuilder | Static sections | No analyst sections | No memo append | **Built:** appendAnalystMemoSections |
| Frontend analyst workspace | None | None | No analyst UI | No Q&A surface | **Built:** AnalystWorkspace |
| Internal/admin gating | requireAuth, INTERNAL_API_KEY | Partial | Internal routes need key | Review queue gated | **Built:** internal analyst routes |
| Tests and validators | Intelligence validation suite | Engine tests | No analyst tests | No output validator | **Built:** AnalystDesk.test.ts |
