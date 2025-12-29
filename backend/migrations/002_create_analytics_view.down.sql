-- Drop analytics view and function
DROP FUNCTION IF EXISTS refresh_comparison_analytics();
DROP INDEX IF EXISTS idx_analytics_pk;
DROP MATERIALIZED VIEW IF EXISTS comparison_analytics;
