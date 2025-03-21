CREATE TABLE IF NOT EXISTS memes (
    id SERIAL PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    manager_quote TEXT NOT NULL,
    template VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    manager_type VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 