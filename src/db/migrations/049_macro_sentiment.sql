-- Migration 049: Machine-Readable Corporate Headline Sentiment Engine
-- 
-- Creates a storage table for aggregated financial headline streams used
-- by the frontend WebGPU sentiment analysis pipeline. Data is written by
-- the background sentiment_feed_mesh.py cron scraper and consumed via the
-- /api/v1/corporate/sentiment-feed/:ticker REST endpoint.
--
-- Zero AI API credits — all processing is local (WGSL compute shaders).

CREATE TABLE IF NOT EXISTS asset_news_sentiment_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(20) NOT NULL,
    headline_text TEXT NOT NULL,
    source_origin VARCHAR(100),
    published_epoch BIGINT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B-tree index for rapid per-ticker text aggregation passes
CREATE INDEX IF NOT EXISTS idx_sentiment_stream
    ON asset_news_sentiment_stream(ticker, published_epoch DESC);
