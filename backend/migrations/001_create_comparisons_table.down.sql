-- Drop comparisons table
DROP INDEX IF EXISTS idx_comparisons_stats_gin;
DROP INDEX IF EXISTS idx_comparisons_metadata_gin;
DROP INDEX IF EXISTS idx_comparisons_content_hash;
DROP INDEX IF EXISTS idx_comparisons_repository;
DROP INDEX IF EXISTS idx_comparisons_expires_at;
DROP INDEX IF EXISTS idx_comparisons_created_at;
DROP INDEX IF EXISTS idx_comparisons_compare_id;

DROP TABLE IF EXISTS comparisons;
