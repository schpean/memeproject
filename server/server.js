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

// Get all memes or filter by company
app.get('/api/memes', async (req, res) => {
  try {
    const { company } = req.query;
    let query = 'SELECT * FROM memes';
    let params = [];

    if (company) {
      query += ' WHERE company = $1';
      params.push(company);
    }

    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new meme
app.post('/api/memes', upload.single('image'), async (req, res) => {
  try {
    const { company, managerQuote, template, country, managerType } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(
      'INSERT INTO memes (company, manager_quote, template, country, manager_type, image_url, votes) VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING *',
      [company, managerQuote, template, country, managerType, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a meme
app.post('/api/memes/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE memes SET votes = votes + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error voting on meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 