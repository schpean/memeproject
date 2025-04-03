-- Drop the existing table if it exists (CAUTION: This will delete all data)
-- Comment this out if you want to preserve existing data and use the migration approach in the server code
-- DROP TABLE IF EXISTS memes;

-- Create the memes table with the simplified schema
-- Only run this if you're setting up a new database
CREATE TABLE IF NOT EXISTS memes (
  id SERIAL PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  image_url TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memes_company ON memes(company);
CREATE INDEX IF NOT EXISTS idx_memes_country ON memes(country);
CREATE INDEX IF NOT EXISTS idx_memes_votes ON memes(votes);
CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at);