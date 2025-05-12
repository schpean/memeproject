-- Extensia pentru UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Insert default roles
INSERT INTO user_roles (name, description) 
VALUES 
    ('user', 'Regular user with basic permissions'),
    ('moderator', 'Moderator with content management permissions'),
    ('admin', 'Administrator with full system access')
ON CONFLICT (name) DO NOTHING;

-- Auth providers table
CREATE TABLE IF NOT EXISTS auth_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Insert default providers
INSERT INTO auth_providers (name, description) 
VALUES 
    ('google', 'Google authentication'),
    ('apple', 'Apple authentication'),
    ('email', 'Email/password authentication')
ON CONFLICT (name) DO NOTHING;

-- Users table with all columns
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    public_id UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    auth_provider_id INTEGER REFERENCES auth_providers(id),
    auth_provider_user_id TEXT,
    display_name TEXT,
    photo_url TEXT,
    role_id INTEGER DEFAULT 1 REFERENCES user_roles(id),
    verification_token TEXT,
    verification_expires TIMESTAMP,
    last_login TIMESTAMP,
    nickname_changed BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    meme_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    password_hash TEXT,
    UNIQUE(auth_provider_id, auth_provider_user_id)
);

-- Create index for public_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);

-- Migration for existing users without public_id
DO $$
BEGIN
    -- Asigură-ne că toți utilizatorii existenți au un public_id
    UPDATE users SET public_id = uuid_generate_v4() WHERE public_id IS NULL;
    
    -- Verifică dacă există coloana google_id și migrează datele la noul sistem agnostic
    DECLARE
        google_provider_id INTEGER;
    BEGIN
        -- Get the Google provider ID
        SELECT id INTO google_provider_id FROM auth_providers WHERE name = 'google';

        -- Migrate existing google_id values to the new columns if google_id exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'google_id'
        ) THEN
            -- Update users with google_id
            UPDATE users
            SET auth_provider_id = google_provider_id,
                auth_provider_user_id = google_id
            WHERE google_id IS NOT NULL
              AND (auth_provider_id IS NULL OR auth_provider_user_id IS NULL);
            
            -- Dacă există coloana google_id dar nu mai este necesară, o eliminăm
            ALTER TABLE users DROP COLUMN IF EXISTS google_id;
        END IF;
    END;
END $$;

-- Memes table with all columns
CREATE TABLE IF NOT EXISTS memes (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    company VARCHAR(100) DEFAULT 'Unknown',
    city VARCHAR(100) DEFAULT 'Unknown',
    country TEXT DEFAULT 'Romania',
    message TEXT,
    user_id BIGINT REFERENCES users(id),
    username TEXT,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP
);

-- Create indexes for memes
CREATE INDEX IF NOT EXISTS idx_memes_company ON memes(company);
CREATE INDEX IF NOT EXISTS idx_memes_city ON memes(city);
CREATE INDEX IF NOT EXISTS idx_memes_votes ON memes(votes);
CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at);
CREATE INDEX IF NOT EXISTS idx_memes_approval_status ON memes(approval_status);
CREATE INDEX IF NOT EXISTS idx_memes_user_id ON memes(user_id);

-- Comments table with all columns
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    meme_id INTEGER REFERENCES memes(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id),
    username VARCHAR(100),
    content TEXT NOT NULL,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    votes INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_comments_meme_id ON comments(meme_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- User votes table
CREATE TABLE IF NOT EXISTS user_votes (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    meme_id INTEGER REFERENCES memes(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, meme_id)
);

-- Comment votes table
CREATE TABLE IF NOT EXISTS comment_votes (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    vote_type INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);

-- Add indexes for user_votes and comment_votes
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_meme_id ON user_votes(meme_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider_id, auth_provider_user_id);

-- Verificare și adăugare coloane care ar putea lipsi
DO $$
BEGIN
    -- Adaugă coloana is_deleted dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Adaugă coloana updated_at dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;

    -- Adaugă coloana password_hash dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        COMMENT ON COLUMN users.password_hash IS 'Stochează hash-ul parolei pentru autentificarea cu email/parolă';
    END IF;

    -- Adaugă coloana approved_by dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE memes ADD COLUMN approved_by BIGINT REFERENCES users(id);
    END IF;

    -- Adaugă coloana approved_at dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE memes ADD COLUMN approved_at TIMESTAMP;
    END IF;
END $$;

-- Corectare tipuri de date pentru user_votes și comment_votes dacă este necesar
DO $$
BEGIN
    -- Migrare user_votes dacă sunt TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_votes' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        CREATE TEMPORARY TABLE temp_user_votes AS 
        SELECT id, user_id, meme_id, vote_type, created_at 
        FROM user_votes;

        DROP TABLE user_votes CASCADE;
        
        -- Recreare tabelă cu constraint-uri corecte
        CREATE TABLE user_votes (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) NOT NULL,
            meme_id INTEGER REFERENCES memes(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, meme_id)
        );

        -- Adaugă datele înapoi folosind id-uri numerice
        INSERT INTO user_votes (id, user_id, meme_id, vote_type, created_at)
        SELECT tv.id, u.id, tv.meme_id, tv.vote_type, tv.created_at
        FROM temp_user_votes tv
        JOIN users u ON u.auth_provider_user_id = tv.user_id;

        DROP TABLE temp_user_votes;
    END IF;

    -- Migrare comment_votes dacă sunt TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comment_votes' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        CREATE TEMPORARY TABLE temp_comment_votes AS 
        SELECT id, user_id, comment_id, vote_type, created_at 
        FROM comment_votes;

        DROP TABLE comment_votes CASCADE;
        
        -- Recreare tabelă cu constraint-uri corecte
        CREATE TABLE comment_votes (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id) NOT NULL,
            comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            vote_type INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, comment_id)
        );

        -- Adaugă datele înapoi folosind id-uri numerice
        INSERT INTO comment_votes (id, user_id, comment_id, vote_type, created_at)
        SELECT tv.id, u.id, tv.comment_id, tv.vote_type, tv.created_at
        FROM temp_comment_votes tv
        JOIN users u ON u.auth_provider_user_id = tv.user_id;

        DROP TABLE temp_comment_votes;
    END IF;
END $$;

-- Adăugare comentariu pentru coloana public_id
COMMENT ON COLUMN users.public_id IS 'UUID unic pentru fiecare utilizator, independent de providerul de autentificare';