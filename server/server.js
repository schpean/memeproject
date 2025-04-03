const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes

// Get all memes or filter by company or country
app.get('/api/memes', async (req, res) => {
  try {
    const { company, country } = req.query;
    let query = 'SELECT * FROM memes';
    let params = [];
    let conditions = [];

    if (company) {
      conditions.push(`company = $${params.length + 1}`);
      params.push(company);
    }

    if (country) {
      conditions.push(`country = $${params.length + 1}`);
      params.push(country);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new meme with simplified fields
app.post('/api/memes', upload.single('image'), async (req, res) => {
  try {
    const { company, country, votes } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Validate required fields
    if (!company || !country) {
      return res.status(400).json({ error: 'Company and country are required' });
    }

    // Convert votes to number or default to 0
    const initialVotes = votes ? parseInt(votes, 10) : 0;

    // Insert with only the simplified fields
    const result = await pool.query(
      'INSERT INTO memes (company, country, image_url, votes) VALUES ($1, $2, $3, $4) RETURNING *',
      [company, country, imageUrl, initialVotes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a meme (kept for compatibility, but may not be needed with initial votes)
app.post('/api/memes/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE memes SET votes = votes + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error voting on meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get memes sorted by votes (high to low)
app.get('/api/memes/top', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM memes ORDER BY votes DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a database migration script to update the schema
// This would typically be in a separate file, but included here for reference
const updateSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if the old columns exist and need to be dropped
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'memes' AND column_name IN ('manager_quote', 'template', 'manager_type')
    `);

    if (columnCheck.rows.length > 0) {
      // Backup the table before modifying
      await client.query('CREATE TABLE memes_backup AS SELECT * FROM memes');
      
      // Drop the columns we no longer need
      await client.query(`
        ALTER TABLE memes 
        DROP COLUMN IF EXISTS manager_quote,
        DROP COLUMN IF EXISTS template,
        DROP COLUMN IF EXISTS manager_type
      `);
      
      console.log('Dropped unused columns from memes table');
    }

    // Ensure votes column has a default value of 0
    await client.query(`
      ALTER TABLE memes 
      ALTER COLUMN votes SET DEFAULT 0
    `);

    await client.query('COMMIT');
    console.log('Database schema updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating database schema:', error);
  } finally {
    client.release();
  }
};

// Run the schema update when the server starts
updateSchema().catch(console.error);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});