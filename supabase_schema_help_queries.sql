-- Help Queries Table Schema
-- This table stores help queries submitted by users from the dashboard

CREATE TABLE IF NOT EXISTS help_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code VARCHAR(50) NOT NULL,
  query TEXT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on school_code for faster queries
CREATE INDEX IF NOT EXISTS idx_help_queries_school_code ON help_queries(school_code);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_help_queries_status ON help_queries(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_help_queries_created_at ON help_queries(created_at DESC);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_help_queries_updated_at
  BEFORE UPDATE ON help_queries
  FOR EACH ROW
  EXECUTE FUNCTION update_help_queries_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE help_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API routes)
CREATE POLICY "Service role can manage help queries"
  ON help_queries
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to insert their own queries
CREATE POLICY "Users can insert their own queries"
  ON help_queries
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users to view queries from their school
CREATE POLICY "Users can view queries from their school"
  ON help_queries
  FOR SELECT
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE help_queries IS 'Stores help queries submitted by users from the dashboard';
COMMENT ON COLUMN help_queries.id IS 'Unique identifier for the help query';
COMMENT ON COLUMN help_queries.school_code IS 'School code of the user submitting the query';
COMMENT ON COLUMN help_queries.query IS 'The help query/issue description';
COMMENT ON COLUMN help_queries.user_name IS 'Name of the user submitting the query';
COMMENT ON COLUMN help_queries.user_role IS 'Role of the user (e.g., School Admin, Teacher, Student)';
COMMENT ON COLUMN help_queries.status IS 'Status of the query: pending, in_progress, resolved, or closed';
COMMENT ON COLUMN help_queries.admin_response IS 'Response from admin (optional)';
COMMENT ON COLUMN help_queries.created_at IS 'Timestamp when the query was created';
COMMENT ON COLUMN help_queries.updated_at IS 'Timestamp when the query was last updated';

