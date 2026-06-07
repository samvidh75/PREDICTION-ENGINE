# TRACK-10 Technical Pipeline Audit

Generated: 2026-06-05T19:29:13.906Z

Path traced: YahooProvider.getHistory -> HistoricalPoint candles -> TechnicalIndicatorEngine.calculate -> EngineInputs.features -> StockStoryEngine.evaluate.

| Symbol | Historical candles | Historical arriving? | Indicator calculation running? | Snapshots generated | Output dropped? | Output overwritten? | Final mapping evidence |
| --- | ---: | --- | --- | ---: | --- | --- | --- |
| RELIANCE | 249 | YES | YES | 249 | NO | NO | Mapped from TechnicalIndicatorEngine.latestComplete into EngineInputs.features |
| TCS | 249 | YES | YES | 249 | NO | NO | Mapped from TechnicalIndicatorEngine.latestComplete into EngineInputs.features |
| INFY | 249 | YES | YES | 249 | NO | NO | Mapped from TechnicalIndicatorEngine.latestComplete into EngineInputs.features |
| HDFCBANK | 249 | YES | YES | 249 | NO | NO | Mapped from TechnicalIndicatorEngine.latestComplete into EngineInputs.features |
| ICICIBANK | 249 | YES | YES | 249 | NO | NO | Mapped from TechnicalIndicatorEngine.latestComplete into EngineInputs.features |

No DB fallback values are used in this runtime proof. Indicators are calculated from live Yahoo historical candles.
