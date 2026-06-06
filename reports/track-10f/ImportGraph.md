# TRACK-10F — Import Graph: TechnicalIndicatorEngine

## Files That Import TechnicalIndicatorEngine

### 1. `src/backend/web/routes/intelligence.ts` (Line 11)

```typescript
import { TechnicalIndicatorEngine } from "../../../services/TechnicalIndicatorEngine";
```

**Usage at runtime:** Line 780-795 — conditional fallback in `GET /api/stockstory/:symbol`

```typescript
if (!feat || feat.rsi == null || feat.macd == null || feat.atr == null || feat.momentum == null || feat.volatility == null) {
  const history = await coordinator.getHistory(sym, "1Y");
  const liveFeat = TechnicalIndicatorEngine.latestComplete(sym, history);
  if (liveFeat) { feat = { ... }; }
}
```

### 2. `src/services/TechnicalIndicatorEngine.ts` (Self-definition)

The file that defines and exports the class. Not an import — it's the source.

---

## Files That Do NOT Import TechnicalIndicatorEngine

Comprehensive search of the entire `src/` and `scripts/` directories (from TRACK-10D initial search and `defs:` scan in 10E):

| Directory | Files Checked | Imports Found |
|-----------|---------------|---------------|
| `src/backend/` | All `.ts` files | 1 (`intelligence.ts`) |
| `src/services/` | All 60+ service files | 0 (beyond self) |
| `src/stockstory/` | All engine + type files | 0 |
| `src/scripts/` | All 20 script files | 0 |
| `src/db/` | All migration/config files | 0 |
| `src/components/` | All React components | 0 |
| `src/pages/` | All page components | 0 |
| `src/hooks/` | All React hooks | 0 |
| `scripts/` | All root scripts | 0 |

---

## Import Dependency Graph

```
TechnicalIndicatorEngine.ts  (definition — line 8: `export class TechnicalIndicatorEngine`)
       │
       │  imported by
       ▼
intelligence.ts  (line 11: `import { TechnicalIndicatorEngine }`)
       │
       │  used in
       ▼
GET /api/stockstory/:symbol  (lines 780-795: conditional fallback)
       │
       └─ ONLY when: feat is null OR feat.{rsi|macd|atr|momentum|volatility} is null

NO OTHER CONSUMER EXISTS.
```

---

## Also Imported Alongside It (intelligence.ts:11)

The import at line 11 in `intelligence.ts` also imports `ProviderCoordinator`:

```typescript
import { ProviderCoordinator } from "../../../services/providers/ProviderCoordinator";
```

`ProviderCoordinator` is used in:
- Line 11 (imported alongside TIE)
- Line 783: `const coordinator = new ProviderCoordinator();` — inside the TIE fallback block

If TIE is removed, `ProviderCoordinator` import can also be removed from `intelligence.ts` (it has no other usage in this file after removing lines 780-795).

---

## Removal Impact on Import Graph

| Action | Files Affected |
|--------|---------------|
| Delete `TechnicalIndicatorEngine.ts` | 1 file deleted |
| Remove `import { TechnicalIndicatorEngine }` from `intelligence.ts:11` | 1 line removed |
| Remove `import { ProviderCoordinator }` from `intelligence.ts:11` | 1 line removed (unused after TIE removal) |
| Remove fallback block `intelligence.ts:780-795` | 16 lines removed |
| Replace with neutral defaults | ~12 lines added |

**Net change: 2 files modified (1 deleted, 1 edited). ~20 lines net reduction.**

---

## Verdict

**TechnicalIndicatorEngine has exactly 1 runtime consumer: `intelligence.ts:780-795` (conditional fallback in stockstory route).** No test files, no scripts, no other routes, no engines, no components depend on it. The import graph is trivially small — a single edge from `intelligence.ts` to `TechnicalIndicatorEngine.ts`.
