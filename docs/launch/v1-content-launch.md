# V1 Content Launch — StockStory India

## Overview

This document catalogs all content pages, components, services, and infrastructure built for the StockStory India V1 public launch. All pages are designed for educational research analysis only — no buy/sell recommendations, no SEBI registration claim.

## Pages (8 new)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/sectors` | `Sectors.tsx` | Grid of 15 sectors with SEBI banner |
| `/sectors/:sectorSlug` | `SectorResearch.tsx` | Deep-dive: overview, metrics, risks, opportunities |
| `/scanner/:preset` | `ScannerLanding.tsx` | Scanner preset landing with intro + preset overview |
| `/methodology` | `Methodology.tsx` | Research methodology with anchored TOC sidebar |
| `/trust` | `Trust.tsx` | Trust & disclosures (8 sections) |
| `/invite` | `Invite.tsx` | Referral program with copy link |
| `/share/research/:shareId` | `SharedResearchSnapshot.tsx` | View shared research snapshot |
| `/research/:symbol` | `CompanyResearchReport.tsx` | View/download company research report |

## Components (2 new)

- **ShareResearchButton**: Dropdown button to share research via ResearchShareService
- **DownloadReportButton**: Download button that produces markdown report via reportToMarkdown

## Trust & Compliance (2 new)

- **SEBIComplianceBanner**: Banner displayed at the top of every public-facing page
- **ResearchOnlyDisclosure**: Card-level disclosure for trust/methodology pages

## Services (pre-existing, now wired)

| Service | Module | Used By |
|---------|--------|---------|
| SectorContentService | `stockstory/content/sector/` | Sectors, SectorResearch |
| MethodologyContent | `stockstory/content/methodology/` | Methodology |
| ResearchShareService | `stockstory/share/` | ShareResearchButton, SharedResearchSnapshot |
| CompanyResearchReportBuilder | `stockstory/reports/` | CompanyResearchReport, DownloadReportButton |
| ReferralService | `stockstory/growth/referral/` | Invite |

## Infrastructure (new)

| File | Purpose |
|------|---------|
| `GrowthContentPipeline.ts` | Generates 23 content opportunities across 4 categories |
| `ExperimentConfig.ts` | 7 experiment definitions (all disabled at launch) |
| `scannerLandingConfig.ts` | Scanner preset definitions |
| `ogImage.ts` | OG image URL resolver |
| `tourConfig.ts` | Product tour definitions (welcome + research) |
| `routes.tsx` | Updated with all V1 page routes |

## Verification

Run `npx tsx scripts/launch/verify-v1-launch.ts` to verify all files exist and routes are registered.

## Compliance Rules

1. Never use "buy", "sell", "recommendation", "target price", "guaranteed", or "SEBI registered" in content
2. Every public page must include SEBIComplianceBanner
3. Every page footer must include "Not investment advice" disclaimer
4. Use the PublicContentSafetyValidator to scan new content before publishing
