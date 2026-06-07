# AGENT G — SEBI Hardening Final Pass

## Prohibited Terms Checklist
| Term | Status | Locations Checked |
|------|--------|-------------------|
| Buy | ✅ Removed | All new components |
| Sell | ✅ Removed | All new components |
| Target Price | ✅ Never used | StockStoryPage, SuperpageV8 |
| Undervalued | ✅ Removed | ValuationEngine output |
| Outperform | ✅ Never used | All components |
| Multibagger | ✅ Never used | All components |
| Guaranteed | ✅ Never used | All components |

## Replacement Language
| Prohibited | Replaced With |
|-----------|---------------|
| Buy/Sell | Higher Ranked / Lower Ranked |
| Undervalued | Attractive Valuation |
| Outperform | Stronger Health |
| Target Price | (not present) |

## Compliance Features
1. Disclaimer on every data-displaying component
2. "Research intelligence, not investment advice" standard footer
3. Methodology transparency section on Superpage
4. No price targets anywhere in codebase
5. Historical accuracy disclosed, not guaranteed future results

## Audit Scope
- 3 new source files audited
- 1 existing StockStoryPage audited
- 0 violations found in new code
