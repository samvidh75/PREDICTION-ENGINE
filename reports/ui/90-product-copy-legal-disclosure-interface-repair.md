# Part T — Product Copy, Legal Disclosure & Interface Repair

## Baseline Commit

`ca46936a6` (Refine advanced interface identity and research surfaces - Part S)

## Baseline Verification Results

- typecheck:all: PASS
- lint: PASS
- test:unit: 1184 passed (117 files)
- validate:hygiene: PASS, 0 secrets
- build:frontend: PASS
- build:backend: PASS

## Scary-Copy Audit Result

Found 20+ occurrences of "Research only", "Not investment advice", "No fabricated metrics" across primary UI areas.

### Removed From Primary UI:
- `ProductIntegrityRow`: "Research only" + "No fabricated metrics" → "Research workspace"
- `StockStoryPage` footers: "Research only. Not investment advice." → "Read Terms & Disclosures" link
- `DashboardHub`: "Track thesis positions from the portfolio page. Research only." → "...portfolio page."
- `PublicPredictionsPage` header: "Research only, not investment advice" → removed
- `TrustCentrePage` pills: "Research only" → "Research workspace", "No fabricated data" → "Structured factor view"
- `PremiumUI.IntegrityStrip`: "Research only" → "Research workspace"
- `WatchlistPage` footer: "Research only. Not investment advice." → "Read Terms & Disclosures" link
- `StockStoryPage.IntelligenceModal`: "Research only. This score explanation..." → score explanation with Terms link

### Kept In Appropriate Places:
- Trust Centre: Appropriate for integrity disclosures
- Share recaps: Compact legal note for shareable content
- Invest handoff: Broker disclaimer in context
- Landing page footer: Single legal disclosure

## Legal-Disclosure Relocation Result

All legal copy consolidated into:
- **Terms & Disclosures page** (new): 7 sections covering informational purpose, no investment advice, no order execution, no broker credential storage, no guaranteed outcomes, data limitations
- **Footer links**: Landing, About, and auth pages link to Terms & Disclosures
- **Company page**: Compact "Read Terms & Disclosures" link replaces warning footer

## Terms & Disclosures Result

Created `src/pages/TermsPage.tsx`:
- Registered as "terms" PageKey in router + PageRenderer
- 6 disclosure sections with clear headings
- Contact information placeholder
- Accessible from all public pages via footer links

## About Page Result

Rewrote `src/pages/PublicAboutPage.tsx`:
- **Before**: "Research-only operating principles" as side panel with 4 warning items + "What StockStory does not do" section
- **After**: Benefit-led sections: "How the research workflow works", "What you get inside", "Why StockStory is different"
- Removed "What StockStory does not do" as main section
- Footer links to Terms & Disclosures and Research Standards

## Auth Page Results

### Signin Page (LoginPage.tsx):
- **Before**: ProductProofPanel with "Return to a source-backed research workspace", "Research transparent", "Research only" warnings
- **After**: "Pick up where your research left off" with saved watchlists, compare, track, review cards + compact Terms link

### Signup Page (SignupPage.tsx):
- **Before**: ProductProofPanel with "Create a workspace around evidence", "Honest data states", "Trust-first workflow" warnings
- **After**: "Build your Indian equity research workspace" with rankings, research pages, compare, track, handoff cards + compact Terms link

## Portfolio Control Result

No "Connect broker" button was present. Portfolio already uses Add position / Import CSV / Open scanner — correct.

## App-Wide Copy Cleanup Result

- "Research only" → "Research workspace" (integrity badges)
- "No fabricated data" → "Structured factor view"
- "No fabricated metrics" → removed
- "Unavailable data labelled" → "Clear signal confidence"
- "Research only. Not investment advice." → removed from footers, replaced with Terms link
- Multiple footer links to Terms & Disclosures added across pages

## Footer/Fine-Print Result

- Landing page footer: Updated with Terms & Disclosures and Research Standards links
- About page footer: Terms + Research Standards links
- Auth pages: Compact Terms link at bottom of left panel
- Company page: Compact Terms link replaces warning footer

## Research Standards Reposition Result

Research Standards linked from:
- Footer links on landing, about, auth pages
- Direct route via "methodology" page key
- Score/signal components
- Compact label: "How scores work", "Read Research Standards"

## Tests Added/Updated

- `TrustCentrePage.test.tsx`: Updated compliance pills to use new copy

## No Fake Data Confirmation

All copy changes are content/copy only. No data fabricated.

## No Buy/Sell/Hold Confirmation

No labels added or changed.

## No Fake Broker Connection Confirmation

No broker connection added or changed.

## No Backend/Provider Leakage Confirmation

No backend language added or exposed.

## No Secrets Confirmation

No secrets, provider keys, or environment variables exposed.

## No Branch/PR Confirmation

All commits directly to main.
