-- Create comparisons table for storing analysis results
CREATE TABLE IF NOT EXISTS comparisons (
  id BIGSERIAL PRIMARY KEY,
  compare_id UUID NOT NULL UNIQUE,
  content_hash VARCHAR(64) NOT NULL,
  
  -- Comparison identity
  repository VARCHAR(512) NOT NULL,
  chart_path VARCHAR(255) NOT NULL,
  version1 VARCHAR(100) NOT NULL,
  version2 VARCHAR(100) NOT NULL,
  values_file VARCHAR(512),
  values_sha256 VARCHAR(64),
  
  -- Queryable metadata (lightweight JSONB)
  metadata JSONB NOT NULL,
  stats JSONB NOT NULL,
  
  -- Compressed storage (BYTEA with gzip)
  full_diff_compressed BYTEA NOT NULL,
  compression_format VARCHAR(20) NOT NULL DEFAULT 'gzip',
  uncompressed_size INTEGER NOT NULL,
  
  -- Metadata
  engine_version VARCHAR(20) NOT NULL,
  helm_version VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT uq_content_hash UNIQUE (content_hash)
);

-- Indexes for performance
CREATE INDEX idx_comparisons_compare_id ON comparisons(compare_id);
CREATE INDEX idx_comparisons_created_at ON comparisons(created_at DESC);
CREATE INDEX idx_comparisons_expires_at ON comparisons(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_comparisons_repository ON comparisons(repository);
CREATE INDEX idx_comparisons_content_hash ON comparisons(content_hash);
CREATE INDEX idx_comparisons_metadata_gin ON comparisons USING GIN(metadata jsonb_path_ops);
CREATE INDEX idx_comparisons_stats_gin ON comparisons USING GIN(stats jsonb_path_ops);

-- Comment on table
COMMENT ON TABLE comparisons IS 'Stores immutable Helm chart comparison results with compression and deduplication';
COMMENT ON COLUMN comparisons.compare_id IS 'Unique identifier for the comparison result (UUID)';
COMMENT ON COLUMN comparisons.content_hash IS 'SHA-256 hash of comparison inputs for deduplication';
COMMENT ON COLUMN comparisons.full_diff_compressed IS 'Complete StructuredDiffResult compressed with gzip';
COMMENT ON COLUMN comparisons.expires_at IS 'Expiration timestamp for automatic cleanup (default: 30 days)';
