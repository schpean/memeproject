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

-- Users table with all columns
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    google_id TEXT UNIQUE,
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
    created_at TIMESTAMP DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Migrare date existente (dacă există)
DO $$
BEGIN
    -- Adaugă coloana is_deleted dacă nu există deja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
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
        JOIN users u ON u.google_id = tv.user_id;

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
        JOIN users u ON u.google_id = tv.user_id;

        DROP TABLE temp_comment_votes;
    END IF;

    -- Migrare memes dacă sunt TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        -- Actualizează meme-urile pentru a folosi ID-uri numerice
        UPDATE memes m
        SET user_id = u.id::bigint
        FROM users u
        WHERE u.google_id = m.user_id;
        
        -- Modifică tipul coloanei după ce datele sunt actualizate
        ALTER TABLE memes 
        ALTER COLUMN user_id TYPE BIGINT USING user_id::bigint,
        ADD CONSTRAINT memes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;

    -- Migrare comments dacă sunt TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'user_id' AND data_type = 'text'
    ) THEN
        -- Actualizează comentariile pentru a folosi ID-uri numerice
        UPDATE comments c
        SET user_id = u.id::bigint
        FROM users u
        WHERE u.google_id = c.user_id;
        
        -- Modifică tipul coloanei după ce datele sunt actualizate
        ALTER TABLE comments 
        ALTER COLUMN user_id TYPE BIGINT USING user_id::bigint,
        ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
    
    -- Modifica tipul coloanei în BIGINT dacă e INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'user_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE memes
        ALTER COLUMN user_id TYPE BIGINT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'user_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE comments
        ALTER COLUMN user_id TYPE BIGINT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_votes' AND column_name = 'user_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE user_votes
        ALTER COLUMN user_id TYPE BIGINT;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comment_votes' AND column_name = 'user_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE comment_votes
        ALTER COLUMN user_id TYPE BIGINT;
    END IF;
END $$;