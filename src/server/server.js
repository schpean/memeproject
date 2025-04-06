// Update any country references to city in the API and database schema

// If there's a memes table being created, update column name from country to city
app.post('/memes', upload.single('image'), async (req, res) => {
  try {
    const {
      company,
      city, // Changed from country to city
      message,
      userId,
      username
    } = req.body;

    // Check for required fields - update to check for city instead of country
    if (!company || !city) { // Changed from country to city
      return res.status(400).json({ error: 'Company and city are required' });
    }

    // For image uploads
    if (req.file) {
      // Save meme with city instead of country
      const result = await pool.query(
        'INSERT INTO memes (image_path, company, city, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.file.filename, company, city, message || '', userId || null, username || 'Anonymous']
      );
      
      return res.status(201).json(result.rows[0]);
    }
    
    // For URL uploads
    if (req.body.image_url) {
      // Save meme with city instead of country
      const result = await pool.query(
        'INSERT INTO memes (image_url, company, city, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.body.image_url, company, city, message || '', userId || null, username || 'Anonymous']
      );
      
      return res.status(201).json(result.rows[0]);
    }
    
    return res.status(400).json({ error: 'No image file or URL provided' });
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// In database setup function, if there's a function that creates the memes table, update it
const setupDatabase = async () => {
  try {
    // Check if memes table exists, if not create it with city instead of country
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'memes'
      );
    `);
    
    if (!result.rows[0].exists) {
      await pool.query(`
        CREATE TABLE memes (
          id SERIAL PRIMARY KEY,
          image_path TEXT,
          image_url TEXT,
          company TEXT NOT NULL,
          city TEXT NOT NULL,
          message TEXT,
          votes INTEGER DEFAULT 0,
          user_id TEXT,
          username TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Created memes table');
    } else {
      // Check if we need to migrate from country to city column
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'memes' AND column_name = 'country'
        );
      `);
      
      if (columnCheck.rows[0].exists) {
        // Rename country column to city
        await pool.query(`ALTER TABLE memes RENAME COLUMN country TO city;`);
        console.log('Renamed country column to city in memes table');
      }
    }
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}; 