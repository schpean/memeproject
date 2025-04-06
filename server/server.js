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

// Get all memes or filter by company or city
app.get('/memes', async (req, res) => {
  try {
    // Get all memes or filter by company or city
    let conditions = [];
    let params = [];
    
    const { company, city } = req.query;
    
    if (company) {
      conditions.push(`company = $${params.length + 1}`);
      params.push(company);
    }
    
    if (city) {
      conditions.push(`city = $${params.length + 1}`);
      params.push(city);
    }
    
    // Build the WHERE clause if we have conditions
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const result = await pool.query(
      `SELECT * FROM memes ${whereClause} ORDER BY created_at DESC`,
      params
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new meme with simplified fields
app.post('/memes', upload.single('image'), async (req, res) => {
  try {
    const { company, city, country, message, userId, username } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    console.log('---DETAILED MEME REQUEST INFO---');
    console.log('- Full request body:', req.body);
    console.log('- Company:', company);
    console.log('- City:', city);
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
    if (!company || !city) {
      console.log('Validation failed - Missing fields:');
      console.log('- Company present:', !!company);
      console.log('- City present:', !!city);
      return res.status(400).json({ error: 'Company and city are required' });
    }

    console.log('Creating meme with user attribution:', username);
    // Convert userId to integer if needed
    let userIdInt;
    try {
      userIdInt = userId ? parseInt(userId, 10) : null;
      // If NaN, set to null
      if (isNaN(userIdInt)) {
        console.log('Warning: userId could not be parsed as integer, using null instead');
        userIdInt = null;
      }
    } catch (parseError) {
      console.error('Error parsing userId:', parseError);
      userIdInt = null;
    }
    
    console.log('Using userIdInt:', userIdInt);
    
    // Check if uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Inserting meme into database with parameters:');
    console.log('- Company:', company);
    console.log('- City:', city);
    console.log('- Country:', country || 'Romania');
    console.log('- Image URL:', imageUrl);
    console.log('- Message:', message || null);
    console.log('- User ID:', userIdInt);
    console.log('- Username:', username);
    
    try {
      // Try to insert the meme
      const result = await pool.query(
        'INSERT INTO memes (company, city, country, image_url, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          company || '', 
          city || '', 
          country || 'Romania', // Always provide a fallback value for country
          imageUrl || '', 
          message || null, 
          userIdInt, 
          username || 'anonymous'
        ]
      );
      console.log('Meme creation successful, returning result');
      res.status(201).json(result.rows[0]);
    } catch (dbError) {
      console.error('Database error while creating meme:', dbError);
      console.error('Error details:', dbError.message);
      
      // Check for missing column error
      if (dbError.code === '42703' && (dbError.message.includes('column "city"') || dbError.message.includes('column "company"') || dbError.message.includes('column "country"'))) {
        console.log('Detected missing column error. Attempting to fix and retry...');
        
        // Run the fix for missing columns
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Check and add city column if needed
          if (dbError.message.includes('column "city"')) {
            await client.query(`ALTER TABLE memes ADD COLUMN city TEXT DEFAULT 'Unknown'`);
            console.log('Added missing city column');
          }
          
          // Check and add company column if needed
          if (dbError.message.includes('column "company"')) {
            await client.query(`ALTER TABLE memes ADD COLUMN company TEXT DEFAULT 'Unknown'`);
            console.log('Added missing company column');
          }
          
          // Check and add country column if needed
          if (dbError.message.includes('column "country"')) {
            await client.query(`ALTER TABLE memes ADD COLUMN country TEXT DEFAULT 'Romania'`);
            console.log('Added missing country column');
          }
          
          // Always ensure country column allows NULL values and has default value
          await client.query(`ALTER TABLE memes ALTER COLUMN country DROP NOT NULL`);
          await client.query(`ALTER TABLE memes ALTER COLUMN country SET DEFAULT 'Romania'`);
          console.log('✅ Made country column nullable with default value "Romania"');
          
          await client.query('COMMIT');
          
          // Retry the insert
          console.log('Retrying meme creation...');
          const retryResult = await pool.query(
            'INSERT INTO memes (company, city, country, image_url, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
              company || '', 
              city || '', 
              country || 'Romania', // Always provide a fallback value for country
              country || 'Romania', 
              imageUrl || '', 
              message || null, 
              userIdInt, 
              username || 'anonymous'
            ]
          );
          console.log('Retry successful, returning result');
          return res.status(201).json(retryResult.rows[0]);
        } catch (retryError) {
          await client.query('ROLLBACK');
          console.error('Error during retry:', retryError);
          throw retryError;
        } finally {
          client.release();
        }
      } else if (dbError.code === '23502' && dbError.message.includes('column "country"')) {
        // Handle NOT NULL violation for country column
        console.log('Detected NOT NULL constraint violation for country column, attempting fix...');
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Make country column nullable
          await client.query(`ALTER TABLE memes ALTER COLUMN country DROP NOT NULL`);
          console.log('Made country column nullable');
          
          await client.query('COMMIT');
          
          // Retry the insert with default country value
          console.log('Retrying meme creation with default country...');
          const retryResult = await pool.query(
            'INSERT INTO memes (company, city, country, image_url, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
              company || '', 
              city || '', 
              'Romania', // Default country 
              imageUrl || '', 
              message || null, 
              userIdInt, 
              username || 'anonymous'
            ]
          );
          console.log('Retry successful, returning result');
          return res.status(201).json(retryResult.rows[0]);
        } catch (retryError) {
          await client.query('ROLLBACK');
          console.error('Error during retry after fixing NOT NULL constraint:', retryError);
          throw retryError;
        } finally {
          client.release();
        }
      } else {
        // For other DB errors, rethrow
        if (dbError.code) {
          console.error('Error code:', dbError.code);
        }
        if (dbError.stack) {
          console.error('Stack trace:', dbError.stack);
        }
        throw dbError;
      }
    }
  } catch (error) {
    console.error('Error creating meme:', error);
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    res.status(500).json({ error: 'Failed to create meme', details: error.message });
  }
});

// Vote on a meme
app.post('/memes/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, voteType } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
    }
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user has already voted for this meme
      const voteCheck = await client.query(
        'SELECT id FROM user_votes WHERE user_id = $1 AND meme_id = $2',
        [userId, id]
      );
      
      if (voteType === 'up') {
        // User wants to upvote
        if (voteCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'You have already voted for this meme' });
        }
        
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
      } else {
        // User wants to remove upvote (downvote)
        if (voteCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'You have not voted for this meme yet' });
        }
        
        // Delete the user's vote
        await client.query(
          'DELETE FROM user_votes WHERE user_id = $1 AND meme_id = $2',
          [userId, id]
        );
        
        // Decrement meme votes
        const result = await client.query(
          'UPDATE memes SET votes = votes - 1 WHERE id = $1 RETURNING *',
          [id]
        );
        
        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Meme not found' });
        }
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling vote on meme:', error);
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

// Add a function to fix user_id column definition
const fixUserIdConstraints = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if there are foreign key constraints on user_id
    const constraintCheck = await client.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
      WHERE rel.relname = 'memes' AND att.attname = 'user_id' AND con.contype = 'f'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('Found foreign key constraints on user_id, removing...');
      
      // Drop each constraint
      for (const row of constraintCheck.rows) {
        await client.query(`ALTER TABLE memes DROP CONSTRAINT IF EXISTS ${row.conname}`);
        console.log(`Dropped constraint: ${row.conname}`);
      }
      
      // Update the column type to be just INTEGER
      await client.query('ALTER TABLE memes ALTER COLUMN user_id TYPE INTEGER');
      console.log('Updated user_id column type');
    } else {
      console.log('No foreign key constraints found on user_id');
    }
    
    await client.query('COMMIT');
    console.log('Successfully fixed user_id constraints');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing user_id constraints:', error);
  } finally {
    client.release();
  }
};

// Run the fix on startup
fixUserIdConstraints().catch(console.error);

// Add a function to check and add required columns to the memes table
const fixMissingColumns = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if the city column exists
    const cityColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'city'
      );
    `);
    
    // Add city column if it doesn't exist
    if (!cityColumnCheck.rows[0].exists) {
      console.log('❌ Missing column "city" in memes table, adding it now...');
      await client.query(`ALTER TABLE memes ADD COLUMN city TEXT DEFAULT 'Unknown'`);
      console.log('✅ Added city column to memes table');
    }

    // Check if the company column exists
    const companyColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'company'
      );
    `);
    
    // Add company column if it doesn't exist
    if (!companyColumnCheck.rows[0].exists) {
      console.log('❌ Missing column "company" in memes table, adding it now...');
      await client.query(`ALTER TABLE memes ADD COLUMN company TEXT DEFAULT 'Unknown'`);
      console.log('✅ Added company column to memes table');
    }
    
    // Check if the country column exists
    const countryColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'country'
      );
    `);
    
    // Add country column if it doesn't exist
    if (!countryColumnCheck.rows[0].exists) {
      console.log('❌ Missing column "country" in memes table, adding it now...');
      await client.query(`ALTER TABLE memes ADD COLUMN country TEXT DEFAULT 'Romania'`);
      console.log('✅ Added country column to memes table');
    }
    
    // Always ensure country column allows NULL values and has default value
    await client.query(`ALTER TABLE memes ALTER COLUMN country DROP NOT NULL`);
    await client.query(`ALTER TABLE memes ALTER COLUMN country SET DEFAULT 'Romania'`);
    console.log('✅ Made country column nullable with default value "Romania"');
    
    await client.query('COMMIT');
    console.log('Successfully fixed missing columns');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing missing columns:', error);
  } finally {
    client.release();
  }
};

// Run the fix on startup
fixMissingColumns().catch(console.error);

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
          city TEXT NOT NULL,
          image_url TEXT NOT NULL,
          message TEXT,
          votes INTEGER DEFAULT 0,
          user_id INTEGER,
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
          ALTER TABLE memes ADD COLUMN user_id INTEGER;
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
          parent_id INTEGER NULL REFERENCES comments(id),
          votes INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Comments table created successfully');
    } else {
      // Check if parent_id column exists, add it if it doesn't
      const parentIdColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'comments' AND column_name = 'parent_id'
        );
      `);
      
      if (!parentIdColumnCheck.rows[0].exists) {
        await client.query(`
          ALTER TABLE comments ADD COLUMN parent_id INTEGER NULL REFERENCES comments(id);
        `);
        console.log('Added parent_id column to comments table');
      }
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
    
    // Check if parent_id column exists in the comments table
    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'parent_id'
      );
    `);
    
    // If parent_id exists, include it in the SELECT statement
    let query = 'SELECT * FROM comments WHERE meme_id = $1 ORDER BY created_at ASC';
    if (!columnCheck.rows[0].exists) {
      console.log('Warning: parent_id column does not exist in comments table');
    }
    
    const result = await pool.query(query, [id]);
    
    // Transform the results to ensure parent_id property is properly named for frontend
    const comments = result.rows.map(comment => {
      // Convert parent_id to parentId for consistent naming in frontend
      const { parent_id, ...rest } = comment;
      return {
        ...rest,
        parentId: parent_id
      };
    });
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment to a meme
app.post('/memes/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, username, parentId } = req.body;
    
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

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCheck = await pool.query('SELECT id FROM comments WHERE id = $1', [parentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }
    
    // Insert with parentId if it's a reply, otherwise null
    const result = await pool.query(
      'INSERT INTO comments (meme_id, user_id, username, content, parent_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, userId, username, content, parentId || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a comment
app.post('/memes/:memeId/comments/:commentId/vote', async (req, res) => {
  try {
    const { memeId, commentId } = req.params;
    const { userId, voteType } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
    }
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if comment exists
      const commentCheck = await client.query(
        'SELECT * FROM comments WHERE id = $1 AND meme_id = $2',
        [commentId, memeId]
      );
      
      if (commentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // Check if user has already voted for this comment
      const voteCheck = await client.query(
        'SELECT id FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
        [userId, commentId]
      );
      
      if (voteType === 'up') {
        // User wants to upvote
        if (voteCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'You have already voted for this comment' });
        }
        
        // Record the user's vote
        await client.query(
          'INSERT INTO comment_votes (user_id, comment_id) VALUES ($1, $2)',
          [userId, commentId]
        );
        
        // Increment comment votes
        const result = await client.query(
          'UPDATE comments SET votes = votes + 1 WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
      } else {
        // User wants to remove upvote (downvote)
        if (voteCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'You have not voted for this comment yet' });
        }
        
        // Delete the user's vote
        await client.query(
          'DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
          [userId, commentId]
        );
        
        // Decrement comment votes
        const result = await client.query(
          'UPDATE comments SET votes = votes - 1 WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query('COMMIT');
        res.json(result.rows[0]);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error handling vote on comment:', error);
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
  
  // Test database connection at startup
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      console.error('Check database credentials and ensure PostgreSQL is running.');
    } else {
      console.log('✅ Database connected successfully:', res.rows[0]);
      
      // Test that memes table exists
      pool.query('SELECT to_regclass(\'public.memes\') as table_exists', (tableErr, tableRes) => {
        if (tableErr) {
          console.error('Error checking if memes table exists:', tableErr.message);
        } else {
          const tableExists = tableRes.rows[0].table_exists;
          console.log('Memes table exists:', !!tableExists);
          
          if (!tableExists) {
            console.error('⚠️ Warning: memes table does not exist.');
            console.error('Make sure database schema is properly initialized.');
          }
        }
      });
    }
  });
});