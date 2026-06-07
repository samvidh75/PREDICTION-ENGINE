# AGENT G — Model Versioning

## Current Model: SSI-V1

### Metadata
- **Version**: SSI-V1
- **Training date**: Calibrated during track-14/16 validation
- **Methodology**: 7-engine composite scoring with sector normalization
- **Performance**: Pending prediction_registry validation data

### Tracking in prediction_registry
Every prediction record includes:
- created_by field: "PredictionFactory-SSI-V1"
- immutably stored at creation time
- Allows historical comparison between model versions

### Model Registry Table (Future)
```sql
CREATE TABLE IF NOT EXISTS model_registry (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  training_date TEXT NOT NULL,
  methodology TEXT,
  training_universe_count INTEGER,
  validation_hit_rate REAL,
  validation_sharpe REAL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Future Version Migration
When SSI-V2 is trained:
1. Insert new record in model_registry
2. Mark SSI-V2 as active (SSI-V1 remains for historical comparison)
3. PredictionFactory uses active model version
4. Historical predictions retain their original model version

### Success
- ✅ Current model version (SSI-V1) tracked in every prediction
- ✅ Model registry schema defined for future versions
- ✅ Historical comparison across versions will be possible
