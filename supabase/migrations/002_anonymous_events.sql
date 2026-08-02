CREATE TABLE IF NOT EXISTS anonymous_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anonymous_events_session ON anonymous_events (session_id);
CREATE INDEX idx_anonymous_events_event ON anonymous_events (event_name);
CREATE INDEX idx_anonymous_events_timestamp ON anonymous_events (event_timestamp);

CREATE OR REPLACE VIEW stock_trends_weekly AS
SELECT
  date_trunc('week', event_timestamp) AS week,
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS unique_users
FROM anonymous_events
GROUP BY week, event_name
ORDER BY week DESC, event_count DESC;

CREATE OR REPLACE FUNCTION get_cohort_retention()
RETURNS TABLE (
  cohort_week DATE,
  week_offset INT,
  active_users BIGINT
) LANGUAGE SQL AS $$
  WITH first_visit AS (
    SELECT
      session_id,
      MIN(DATE(event_timestamp)) AS first_date
    FROM anonymous_events
    GROUP BY session_id
  )
  SELECT
    fv.first_date AS cohort_week,
    EXTRACT(WEEK FROM (ae.event_timestamp - fv.first_date))::INT AS week_offset,
    COUNT(DISTINCT ae.session_id) AS active_users
  FROM anonymous_events ae
  JOIN first_visit fv ON ae.session_id = fv.session_id
  GROUP BY fv.first_date, week_offset
  ORDER BY fv.first_date, week_offset;
$$;

CREATE OR REPLACE FUNCTION get_analytics_funnel()
RETURNS TABLE (
  step_name TEXT,
  session_count BIGINT
) LANGUAGE SQL AS $$
  SELECT 'page_view'::TEXT AS step_name, COUNT(DISTINCT session_id)::BIGINT AS session_count
  FROM anonymous_events WHERE event_name = 'page_view'
  UNION ALL
  SELECT 'search', COUNT(DISTINCT session_id)
  FROM anonymous_events WHERE event_name = 'search'
  UNION ALL
  SELECT 'view_stock', COUNT(DISTINCT session_id)
  FROM anonymous_events WHERE event_name = 'view_stock'
  UNION ALL
  SELECT 'compare', COUNT(DISTINCT session_id)
  FROM anonymous_events WHERE event_name = 'compare'
  UNION ALL
  SELECT 'invest_click', COUNT(DISTINCT session_id)
  FROM anonymous_events WHERE event_name = 'invest_click'
  ORDER BY session_count DESC;
$$;
