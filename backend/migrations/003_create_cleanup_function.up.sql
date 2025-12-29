-- Create function to delete expired comparisons
CREATE OR REPLACE FUNCTION delete_expired_comparisons()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  result_count BIGINT;
BEGIN
  DELETE FROM comparisons
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  -- Log the cleanup
  RAISE NOTICE 'Deleted % expired comparisons', result_count;
  
  RETURN QUERY SELECT result_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION delete_expired_comparisons() IS 'Deletes comparison results that have passed their expiration date';
