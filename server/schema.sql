-- Drop the existing table if it exists (CAUTION: This will delete all data)
-- Comment this out if you want to preserve existing data and use the migration approach in the server code
-- DROP TABLE IF EXISTS memes;

-- Create the memes table with the simplified schema
-- Only run this if you're setting up a new database
CREATE TABLE IF NOT EXISTS memes (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  company VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  message TEXT,
  user_id INTEGER,
  username VARCHAR(100),
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memes_company ON memes(company);
CREATE INDEX IF NOT EXISTS idx_memes_city ON memes(city);
CREATE INDEX IF NOT EXISTS idx_memes_votes ON memes(votes);
CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at);
CREATE INDEX IF NOT EXISTS idx_memes_approval_status ON memes(approval_status);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- Insert default roles if they don't exist
INSERT INTO user_roles (name, description) 
VALUES ('user', 'Regular user with basic permissions') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_roles (name, description) 
VALUES ('moderator', 'Moderator with content management permissions') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_roles (name, description) 
VALUES ('admin', 'Administrator with full system access') 
ON CONFLICT (name) DO NOTHING;

-- Alter users table to add role_id if it doesn't exist
-- This assumes the users table already exists
-- If running this directly, you might need to handle errors
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) THEN
        -- Add role_id column with default to regular user (1)
        ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 1;
        -- Add foreign key constraint
        ALTER TABLE users ADD CONSTRAINT fk_user_role 
        FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE SET DEFAULT;
    END IF;
END $$;