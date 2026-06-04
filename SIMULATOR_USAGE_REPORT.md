# SIMULATOR USAGE REPORT

## Summary
All database simulation and in-memory mock storage components have been audited. Memory-based fallbacks have been completely excised from the production execution paths to guarantee strict persistence.

## Classification

| Component | Description | Classification | Rationale |
|-----------|-------------|----------------|-----------|
| **Database Simulator** (`isMock`, `mockQuery`) | In-memory query simulation fallback for SQL INSERT / UPDATE | **REMOVED** (Development Only) | Fallback was used to allow tests to pass when no postgres database was available. Excised to ensure all database queries hit real PostgreSQL. |
| **In-Memory Store** (`mockDb`) | Local Set and Map structures containing records in memory | **REMOVED** (Development Only) | Simulated table storage. Removed to prevent silent failures where data does not actually persist. |
| **In-Memory Inserts** | In-memory query intercepts mimicking table rows inserts | **REMOVED** (Development Only) | Removed from the query dispatcher. All insert commands now execute directly against the pg Pool. |
| **Data Cache** (`DataCache`) | Key-value caching layer in frontend/services | **Production Path** (Production-ready) | Memory caching of read results is retained for performance and rate limit optimization (with short TTL), but not as a fallback for persistence. |
