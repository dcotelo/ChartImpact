-- Create materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS comparison_analytics AS
SELECT 
  repository,
  chart_path,
  COUNT(*) as comparison_count,
  SUM(CASE WHEN (stats->'resources'->>'modified')::int > 0 THEN 1 ELSE 0 END) as with_changes,
  AVG((stats->'resources'->>'modified')::int) as avg_modified_resources,
  AVG((stats->'resources'->>'added')::int) as avg_added_resources,
  AVG((stats->'resources'->>'removed')::int) as avg_removed_resources,
  MAX(created_at) as last_comparison_at,
  MIN(created_at) as first_comparison_at
FROM comparisons
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY repository, chart_path;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_analytics_pk ON comparison_analytics(repository, chart_path);

-- Create function to refresh analytics view
CREATE OR REPLACE FUNCTION refresh_comparison_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY comparison_analytics;
END;
$$ LANGUAGE plpgsql;

-- Comment on view
COMMENT ON MATERIALIZED VIEW comparison_analytics IS 'Aggregated statistics for popular charts and comparison trends (refreshed daily)';
