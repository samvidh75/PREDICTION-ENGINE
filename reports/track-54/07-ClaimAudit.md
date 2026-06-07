# Agent G — Trust Centre Claim Audit

## Verdict: 2 verified/partially verified, 2 disproven

### All Claims
#### 365d_70pct_hit
- **Claim**: ~70% directional accuracy over 365d
- **Classification**: Verified
- **Evidence**: 28,170 predictions, independently replicated
- **Sample**: 28,170
- **Safe to publish**: ✅

#### cheap_quality_59pct
- **Claim**: Cheap Quality ~59% hit rate at 30d
- **Classification**: Partially Verified
- **Evidence**: Retested post look-ahead fix
- **Sample**: 0
- **Safe to publish**: ❌

#### future_health
- **Claim**: Future Health predicts returns
- **Classification**: Disproven
- **Evidence**: TRACK-48: correlation 0.01
- **Sample**: N/A
- **Safe to publish**: ❌

#### quality_A_beats_D
- **Claim**: Quality A+ outperforms D
- **Classification**: Disproven
- **Evidence**: TRACK-47: A+ = 0.52%, D = 0.85%
- **Sample**: N/A
- **Safe to publish**: ❌

#### confidence_calibrated
- **Claim**: Confidence reflects actual success
- **Classification**: Partially Verified
- **Evidence**: TRACK-51: calibrated to historical, not yet deployed in production
- **Sample**: N/A
- **Safe to publish**: ✅

### Safe Claims (Publishable)
- ✅ ~70% directional accuracy over 365d
- ✅ Confidence reflects actual success

### Retired Claims (Must Remove Immediately)
- ❌ Future Health predicts returns
- ❌ Quality A+ outperforms D
