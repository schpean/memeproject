const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
require('dotenv').config();
const axios = require('axios');

const app = express();
const port = process.env.PORT || 1337;

// Middleware
app.use(cors({
  origin: ['http://localhost:1338', 'http://localhost:3000'], // Allow both React dev server ports
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // Allow cookies if needed
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
app.get('/memes', async (req, res) => {
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
app.post('/memes', upload.single('image'), async (req, res) => {
  try {
    const { company, country, message, userId, username } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    console.log('Received meme creation request with:');
    console.log('- Company:', company);
    console.log('- Country:', country);
    console.log('- Has image:', !!req.file);
    console.log('- Image URL:', imageUrl);
    console.log('- Message:', message);
    console.log('- User ID:', userId);
    console.log('- Username:', username);

    // Require authentication
    if (!userId || !username) {
      return res.status(401).json({ error: 'Authentication required to create memes' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    // Validate required fields
    if (!company || !country) {
      return res.status(400).json({ error: 'Company and country are required' });
    }

    console.log('Creating meme with user attribution:', username);
    // Convert userId to integer if needed
    const userIdInt = parseInt(userId, 10);
    
    // Insert the meme with user information
    const result = await pool.query(
      'INSERT INTO memes (company, country, image_url, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [company, country, imageUrl, message || null, userIdInt, username]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Failed to create meme' });
  }
});

// Vote on a meme (kept for compatibility, but may not be needed with initial votes)
app.post('/memes/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    // Check if user has already voted for this meme
    const voteCheck = await pool.query(
      'SELECT id FROM user_votes WHERE user_id = $1 AND meme_id = $2',
      [userId, id]
    );
    
    if (voteCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You have already voted for this meme' });
    }
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Record the user's vote
      await client.query(
        'INSERT INTO user_votes (user_id, meme_id) VALUES ($1, $2)',
        [userId, id]
      );
      
      // Increment meme votes
      const result = await client.query(
        'UPDATE memes SET votes = votes + 1 WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Meme not found' });
      }
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error voting on meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get memes sorted by votes (high to low)
app.get('/memes/top', async (req, res) => {
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

    // Add message column if it doesn't exist
    const messageColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'message'
      );
    `);
    
    if (!messageColumnCheck.rows[0].exists) {
      await client.query(`
        ALTER TABLE memes ADD COLUMN message TEXT;
      `);
      console.log('Added message column to memes table');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating schema:', error);
  } finally {
    client.release();
  }
};

// Run the schema updates on startup
updateSchema().catch(console.error);

// Setup meme table if it doesn't exist
const setupMemeTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if memes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'memes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create memes table
      await client.query(`
        CREATE TABLE memes (
          id SERIAL PRIMARY KEY,
          company TEXT NOT NULL,
          country TEXT NOT NULL,
          image_url TEXT NOT NULL,
          message TEXT,
          votes INTEGER DEFAULT 0,
          user_id INTEGER REFERENCES users(id),
          username TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Memes table created successfully');
    } else {
      // Check if we need to add user_id and username columns to existing table
      const userIdColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'memes' AND column_name = 'user_id'
        );
      `);
      
      if (!userIdColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE memes ADD COLUMN user_id INTEGER REFERENCES users(id);
        `);
        console.log('Added user_id column to memes table');
      }
      
      const usernameColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'memes' AND column_name = 'username'
        );
      `);
      
      if (!usernameColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE memes ADD COLUMN username TEXT;
        `);
        console.log('Added username column to memes table');
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up memes table:', error);
  } finally {
    client.release();
  }
};

// Run the table setup on startup
setupMemeTable().catch(console.error);

// Add these new routes for user authentication after your existing routes

// Create a new user or get existing one after Google OAuth
app.post('/users/google-auth', async (req, res) => {
  try {
    const { googleId, email, displayName, photoURL, token } = req.body;
    
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }
    
    // Verify the token with Google (optional with the new flow)
    // Since we're getting the user info directly from Google already
    // But we can keep basic validation
    if (!token) {
      console.warn('No token provided for validation');
    }
    
    // Check if user already exists
    let result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    
    if (result.rows.length > 0) {
      // User exists, update last login time and info if needed
      const user = result.rows[0];
      await pool.query(
        'UPDATE users SET last_login = NOW(), display_name = $1, photo_url = $2 WHERE id = $3',
        [displayName, photoURL, user.id]
      );
      return res.json(user);
    }
    
    // User doesn't exist, generate a username
    const username = await generateUniqueUsername(displayName);
    
    // Create new user
    result = await pool.query(
      'INSERT INTO users (google_id, email, display_name, photo_url, username) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [googleId, email, displayName, photoURL, username]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error during Google authentication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate a unique username
async function generateUniqueUsername(displayName) {
  // Create a base username from display name
  let baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .substring(0, 10); // Limit length
  
  // Add some random colors or animals as prefix
  const colors = ['red', 'blue', 'green', 'purple', 'golden', 'silver', 'black', 'white'];
  const animals = ['fox', 'wolf', 'eagle', 'bear', 'tiger', 'lion', 'hawk', 'deer', 'panda'];
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  
  // Add random number
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  
  // Generate username
  let username = `${randomColor}${randomAnimal}${randomNum}`;
  
  // Check if username exists
  let usernameExists = true;
  while (usernameExists) {
    const result = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      usernameExists = false;
    } else {
      // Try another random number
      const newRandomNum = Math.floor(Math.random() * 9000) + 1000;
      username = `${randomColor}${randomAnimal}${newRandomNum}`;
    }
  }
  
  return username;
}

// Add a migration to create the users table if it doesn't exist
const setupUserTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create users table
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          google_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          photo_url TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          last_login TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Users table created successfully');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up users table:', error);
  } finally {
    client.release();
  }
};

// Run the schema updates
setupUserTable().catch(console.error);

// Add this after your existing meme routes
// Create comments table if it doesn't exist
const setupCommentsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if comments table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create comments table
      await client.query(`
        CREATE TABLE comments (
          id SERIAL PRIMARY KEY,
          meme_id INTEGER REFERENCES memes(id),
          user_id INTEGER REFERENCES users(id),
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Comments table created successfully');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up comments table:', error);
  } finally {
    client.release();
  }
};

// Create user_votes table to track user votes
const setupUserVotesTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user_votes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_votes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create user_votes table
      await client.query(`
        CREATE TABLE user_votes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          meme_id INTEGER REFERENCES memes(id),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, meme_id)
        )
      `);
      
      console.log('User votes table created successfully');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up user votes table:', error);
  } finally {
    client.release();
  }
};

// Run the new schema updates
setupCommentsTable().catch(console.error);
setupUserVotesTable().catch(console.error);

// Get comments for a meme
app.get('/memes/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if comments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({ error: 'Comments functionality not available yet' });
    }
    
    const result = await pool.query(
      'SELECT * FROM comments WHERE meme_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment to a meme
app.post('/memes/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, username } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    // First check if comments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({ error: 'Comments functionality not available yet' });
    }
    
    // Check if meme exists
    const memeCheck = await pool.query('SELECT id FROM memes WHERE id = $1', [id]);
    if (memeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    const result = await pool.query(
      'INSERT INTO comments (meme_id, user_id, username, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, username, content]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single meme by ID with detailed information
app.get('/memes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM memes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    // Try to get comment count, but don't fail if comments table doesn't exist
    try {
      const commentCountResult = await pool.query(
        'SELECT COUNT(*) FROM comments WHERE meme_id = $1',
        [id]
      );
      
      const meme = result.rows[0];
      meme.comment_count = parseInt(commentCountResult.rows[0].count);
      
      res.json(meme);
    } catch (error) {
      // If the comments table doesn't exist, just return the meme without comment count
      console.log('Comments functionality not available yet');
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error(`Error fetching meme ${id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});