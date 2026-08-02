-- Phase 20B: Cache expiry index for EOD data cache
--
-- The `cache` table stores all cached data.  The EOD refresh scheduler
-- needs to efficiently find rows that are still fresh (`expires_at` query),
-- and cleanup needs to find expired rows.
--
-- This index covers both cases.

CREATE INDEX IF NOT EXISTS cache_expires_at_idx ON cache(expires_at);
CREATE INDEX IF NOT EXISTS cache_key_prefix_idx ON cache(key);
