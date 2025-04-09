const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./email');
const config = require('./config');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = config.port;

// Create an HTTP server instance
const server = http.createServer(app);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Send a welcome message
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected to WebSocket server' }));
  
  // Handle messages from clients
  ws.on('message', (message) => {
    console.log('Received message:', message);
    
    // Parse the message (assuming JSON)
    try {
      const parsedMessage = JSON.parse(message);
      
      // Handle different message types (if needed)
      if (parsedMessage.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Function to broadcast to all connected clients
const broadcastMessage = (type, data) => {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  // Also store the message in the updates queue for polling clients
  addToUpdatesQueue({ type, data });
};

// Store recent updates for polling clients
const updatesQueue = [];
const MAX_UPDATES = 100; // Keep last 100 updates

const addToUpdatesQueue = (update) => {
  // Add timestamp to the update
  const timestampedUpdate = {
    ...update,
    timestamp: Date.now()
  };
  
  // Add to queue and trim if necessary
  updatesQueue.push(timestampedUpdate);
  if (updatesQueue.length > MAX_UPDATES) {
    updatesQueue.shift(); // Remove oldest update
  }
};

// Add an HTTP polling endpoint for environments where WebSockets are blocked
app.get('/api/updates', (req, res) => {
  // Get the last timestamp from the client
  const lastTimestamp = parseInt(req.query.since || '0');
  
  // Filter updates newer than the provided timestamp
  const newUpdates = updatesQueue.filter(update => update.timestamp > lastTimestamp);
  
  // Return the updates and the current server timestamp
  res.json({
    updates: newUpdates,
    timestamp: Date.now(),
    message: 'Using HTTP polling fallback instead of WebSockets'
  });
});

// Custom CORS middleware to handle credentials properly
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = config.corsConfig.allowedOrigins.filter(origin => origin !== '*');
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', config.corsConfig.methods.join(', '));
    res.header('Access-Control-Allow-Headers', config.corsConfig.allowedHeaders.join(', '));
  } else if (!origin || origin === 'null') {
    // Allow requests from file:// protocol or null origin
    res.header('Access-Control-Allow-Origin', 'null');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', config.corsConfig.methods.join(', '));
    res.header('Access-Control-Allow-Headers', config.corsConfig.allowedHeaders.join(', '));
  } else {
    // For non-matching origins, return a 403 Forbidden
    return res.status(403).json({ 
      error: 'CORS Error', 
      message: 'Origin not allowed', 
      origin: origin || 'undefined',
      allowedOrigins: allowedOrigins 
    });
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
};

// Apply custom CORS middleware
app.use(corsMiddleware);
app.use(express.json());

// Add CORS headers for static files
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.corsConfig.allowedOrigins.filter(origin => origin !== '*');
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // For image requests without credentials, we can still use wildcard
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', express.static('uploads'));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

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

// Role-based authorization middleware
const authorize = (roles = []) => {
  // roles parameter can be a single role string (e.g., 'admin') 
  // or an array of roles (e.g., ['admin', 'moderator'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    // Get user ID from the request
    const userId = req.headers['user-id'] || req.query.userId || (req.body && req.body.userId);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    try {
      // Get user and their role - use google_id instead of id
      const result = await pool.query(`
        SELECT u.*, r.name as role_name 
        FROM users u
        LEFT JOIN user_roles r ON u.role_id = r.id
        WHERE u.google_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Unauthorized - User not found' });
      }
      
      const user = result.rows[0];
      
      // Check if role is required and if user's role is allowed
      if (roles.length && !roles.includes(user.role_name)) {
        return res.status(403).json({ 
          error: 'Forbidden - Insufficient permissions',
          requiredRoles: roles,
          userRole: user.role_name
        });
      }
      
      // Add user to request for use in route handlers
      req.user = user;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

// Routes

// Get all memes or filter by company or city
app.get('/memes', async (req, res) => {
  try {
    // Fix future dates before proceeding with the query
    await fixAllFutureDates();
    
    // Get all memes or filter by company or city
    let conditions = [];
    let params = [];
    
    const { company, city, time, sort } = req.query;
    
    // Log the filter parameters for debugging
    console.log(`Request for memes with filters: time=${time || 'all'}, sort=${sort || 'recent'}`);
    
    if (company) {
      conditions.push(`company = $${params.length + 1}`);
      params.push(company);
    }
    
    if (city) {
      conditions.push(`city = $${params.length + 1}`);
      params.push(city);
    }
    
    // Time filtering on the server side with improved date handling
    const now = new Date();
    console.log(`Current server time: ${now.toISOString()}`);
    
    // Always ensure we don't show future memes
    conditions.push(`created_at <= $${params.length + 1}`);
    params.push(now.toISOString());
    
    if (time) {
      if (time === 'now') {
        // Last hour
        const hourAgo = new Date(now);
        hourAgo.setHours(hourAgo.getHours() - 1);
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(hourAgo.toISOString());
        console.log(`Time filter: now (${hourAgo.toISOString()})`);
      } else if (time === 'today') {
        // Today
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(today.toISOString());
        console.log(`Time filter: today (${today.toISOString()})`);
      } else if (time === 'week') {
        // Last week
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        conditions.push(`created_at >= $${params.length + 1}`);
        params.push(weekAgo.toISOString());
        console.log(`Time filter: week (${weekAgo.toISOString()})`);
      }
    }
    
    // Only show approved memes by default for regular users
    const userId = req.headers['user-id'] || req.query.userId;
    let userRole = 'user';
    
    if (userId) {
      try {
        const userResult = await pool.query(`
          SELECT u.*, r.name as role_name 
          FROM users u
          LEFT JOIN user_roles r ON u.role_id = r.id
          WHERE u.id = $1
        `, [userId]);
        
        if (userResult.rows.length > 0) {
          userRole = userResult.rows[0].role_name;
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    }
    
    // For regular users, only show approved memes
    if (userRole !== 'admin' && userRole !== 'moderator') {
      conditions.push(`approval_status = $${params.length + 1}`);
      params.push('approved');
    }
    
    // Build the WHERE clause if we have conditions
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Determine sorting order with improved stability (add id to sort for consistent results)
    let orderClause = 'ORDER BY created_at DESC, id DESC';
    if (sort === 'upvoted') {
      orderClause = 'ORDER BY votes DESC, created_at DESC, id DESC';
    } else if (sort === 'commented') {
      // We don't have comment count in the database, so we'll sort by created_at as fallback
      orderClause = 'ORDER BY created_at DESC, id DESC';
    }
    
    console.log(`Query: SELECT * FROM memes ${whereClause} ${orderClause}`);
    console.log('Params:', params);
    
    const result = await pool.query(
      `SELECT * FROM memes ${whereClause} ${orderClause}`,
      params
    );
    
    console.log(`Found ${result.rows.length} memes matching the criteria`);
    
    // For debugging, log some sample dates
    if (result.rows.length > 0) {
      console.log('Sample meme dates:');
      for (let i = 0; i < Math.min(3, result.rows.length); i++) {
        const meme = result.rows[i];
        console.log(`- Meme ${meme.id}: ${meme.created_at}, Votes: ${meme.votes || 0}`);
      }
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Immediately fix all future dates in the database
async function fixAllFutureDates() {
  const client = await pool.connect();
  try {
    const now = new Date();
    console.log(`Checking for future dates (current time: ${now.toISOString()})...`);
    
    // Find and fix memes with future dates
    const result = await client.query(
      `UPDATE memes SET created_at = $1 WHERE created_at > $1 RETURNING id, created_at`,
      [now.toISOString()]
    );
    
    if (result.rows.length > 0) {
      console.log(`Fixed ${result.rows.length} memes with future dates:`);
      result.rows.forEach(meme => {
        console.log(`- Fixed meme ${meme.id}: set to ${now.toISOString()}`);
      });
    }
    
    return result.rows.length;
  } catch (error) {
    console.error('Error fixing future dates:', error);
    return 0;
  } finally {
    client.release();
  }
}

// Run the fix on startup
(async function() {
  try {
    console.log('Running startup check for future dates...');
    const fixedCount = await fixAllFutureDates();
    console.log(`Startup check complete. Fixed ${fixedCount} memes with future dates.`);
  } catch (error) {
    console.error('Error during startup date fix:', error);
  }
})();

// Get pending memes for approval (admin and moderator only)
app.get('/memes/pending', authorize(['admin', 'moderator']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM memes WHERE approval_status = $1 ORDER BY created_at ASC',
      ['pending']
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting pending memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject a meme
app.put('/memes/:id/approval', authorize(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }
    
    // Update meme approval status
    const result = await pool.query(
      'UPDATE memes SET approval_status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
      [status, reason || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meme approval status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new meme with simplified fields
app.post('/memes', upload.single('image'), async (req, res) => {
  try {
    const { company, city, message, userId, username } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    
    console.log('---DETAILED MEME REQUEST INFO---');
    console.log('- Full request body:', req.body);
    console.log('- Company:', company);
    console.log('- City:', city);
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
    
    // Use userId directly as string, no need to parse as integer
    const userIdStr = userId ? String(userId) : null;
    
    console.log('Using userIdStr:', userIdStr);
    
    // Check if uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Inserting meme into database with parameters:');
    console.log('- Company:', company);
    console.log('- City:', city);
    console.log('- Image URL:', imageUrl);
    console.log('- Message:', message || null);
    console.log('- User ID:', userIdStr);
    console.log('- Username:', username);
    
    try {
      // Check if user is admin or moderator - their posts are auto-approved
      let approvalStatus = 'pending';
      try {
        const userResult = await pool.query(`
          SELECT u.*, r.name as role_name 
          FROM users u
          LEFT JOIN user_roles r ON u.role_id = r.id
          WHERE u.google_id = $1
        `, [userIdStr]);
        
        if (userResult.rows.length > 0 && 
           (userResult.rows[0].role_name === 'admin' || userResult.rows[0].role_name === 'moderator')) {
          approvalStatus = 'approved';
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
      
      // Try to insert the meme
      const result = await pool.query(
        'INSERT INTO memes (company, city, image_url, message, user_id, username, approval_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          company || '', 
          city || '', 
          imageUrl || '', 
          message || null, 
          userIdStr, 
          username || 'anonymous',
          approvalStatus
        ]
      );
      console.log('Meme creation successful, returning result');
      
      // Broadcast the new meme to all connected clients
      if (result.rows.length > 0) {
        const newMeme = result.rows[0];
        broadcastMessage('newMeme', newMeme);
      }
      
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
            'INSERT INTO memes (company, city, image_url, message, user_id, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [
              company || '', 
              city || '', 
              imageUrl || '', 
              message || null, 
              userIdStr, 
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
      }
      
      // Return a more detailed error response
      res.status(500).json({ 
        error: 'Failed to create meme',
        details: dbError.message,
        code: dbError.code
      });
    }
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ 
      error: 'Failed to create meme',
      details: error.message,
      type: error.name,
      code: error.code
    });
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
      
      // Get the user's database ID from their Google ID
      const userCheck = await client.query('SELECT id FROM users WHERE google_id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      
      const dbUserId = userCheck.rows[0].id;
      
      // Check if user has already voted for this meme
      const voteCheck = await client.query(
        'SELECT id FROM user_votes WHERE user_id = $1 AND meme_id = $2',
        [dbUserId, id]
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
          [dbUserId, id]
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
        
        // Broadcast the updated meme
        broadcastMessage('memeUpdated', result.rows[0]);
        
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
          [dbUserId, id]
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
        
        // Broadcast the updated meme
        broadcastMessage('memeUpdated', result.rows[0]);
        
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
    
    // Check if the approval_status column exists
    const approvalStatusColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'approval_status'
      );
    `);
    
    // Add approval_status column if it doesn't exist
    if (!approvalStatusColumnCheck.rows[0].exists) {
      console.log('❌ Missing column "approval_status" in memes table, adding it now...');
      await client.query(`
        ALTER TABLE memes 
        ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'
      `);
      
      // Add check constraint
      await client.query(`
        ALTER TABLE memes 
        ADD CONSTRAINT approval_status_check 
        CHECK (approval_status IN ('pending', 'approved', 'rejected'))
      `);
      
      // Update existing memes to be approved by default
      await client.query(`
        UPDATE memes 
        SET approval_status = 'approved' 
        WHERE approval_status IS NULL OR approval_status = 'pending'
      `);
      
      console.log('✅ Added approval_status column to memes table');
    }
    
    // Check if the rejection_reason column exists
    const rejectionReasonColumnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'memes' AND column_name = 'rejection_reason'
      );
    `);
    
    // Add rejection_reason column if it doesn't exist
    if (!rejectionReasonColumnCheck.rows[0].exists) {
      console.log('❌ Missing column "rejection_reason" in memes table, adding it now...');
      await client.query(`ALTER TABLE memes ADD COLUMN rejection_reason TEXT`);
      console.log('✅ Added rejection_reason column to memes table');
    }
    
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
      // Create memes table - Changed user_id to TEXT
      await client.query(`
        CREATE TABLE memes (
          id SERIAL PRIMARY KEY,
          company TEXT NOT NULL,
          city TEXT NOT NULL,
          image_url TEXT NOT NULL,
          message TEXT,
          votes INTEGER DEFAULT 0,
          user_id TEXT,
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
          ALTER TABLE memes ADD COLUMN user_id TEXT;
        `);
        console.log('Added user_id column to memes table');
      } else {
        // Check if user_id is INTEGER and change it to TEXT if needed
        const userIdTypeCheck = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'memes' AND column_name = 'user_id'
        `);
        
        if (userIdTypeCheck.rows.length > 0 && userIdTypeCheck.rows[0].data_type === 'integer') {
          console.log('Converting user_id column from INTEGER to TEXT...');
          await client.query(`
            ALTER TABLE memes ALTER COLUMN user_id TYPE TEXT;
          `);
          console.log('Successfully converted user_id column to TEXT');
        }
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

// Update the Google OAuth login to include role information and email verification
app.post('/users/google-auth', async (req, res) => {
  try {
    const { googleId, email, displayName, photoURL, token } = req.body;
    
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }
    
    // Verify the token with Google using server-side client secret from config
    if (!token) {
      console.warn('No token provided for validation');
    }
    
    // Check if user already exists
    let result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.google_id = $1
    `, [googleId]);
    
    if (result.rows.length > 0) {
      // User exists, update last login time
      const user = result.rows[0];
      await pool.query(
        'UPDATE users SET last_login = NOW(), photo_url = $1 WHERE id = $2',
        [getMascotImageUrl(user.username), user.id]
      );
      
      // If the user hasn't verified their email yet, prompt them to verify
      if (!user.is_verified) {
        // Generate a new verification token
        const verificationToken = uuidv4();
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24); // Token expires in 24 hours
        
        // Update the user's verification token
        await pool.query(
          'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
          [verificationToken, expiryTime, user.id]
        );
        
        // Send verification email
        await emailService.sendVerificationEmail(user, verificationToken);
        
        return res.json({
          ...user,
          isAdmin: user.role_name === 'admin',
          isModerator: user.role_name === 'moderator' || user.role_name === 'admin',
          needsVerification: true
        });
      }
      
      return res.json({
        ...user,
        isAdmin: user.role_name === 'admin',
        isModerator: user.role_name === 'moderator' || user.role_name === 'admin'
      });
    }
    
    // User doesn't exist, generate a unique username
    const username = await generateUniqueUsername(displayName);
    
    // Get default role id (user role)
    const roleResult = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1',
      ['user']
    );
    
    const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1;
    
    // Generate verification token
    const verificationToken = uuidv4();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // Token expires in 24 hours
    
    // Hide real name by using the username instead of displayName
    // Use mascot image instead of real profile photo
    result = await pool.query(
      'INSERT INTO users (google_id, email, display_name, photo_url, username, role_id, verification_token, verification_expires) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [googleId, email, username, getMascotImageUrl(username), username, roleId, verificationToken, expiryTime]
    );
    
    // Get role name for the new user
    const userWithRole = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [result.rows[0].id]);
    
    const newUser = userWithRole.rows[0];
    
    // Send verification email
    await emailService.sendVerificationEmail(newUser, verificationToken);
    
    res.status(201).json({
      ...newUser,
      isAdmin: newUser.role_name === 'admin',
      isModerator: newUser.role_name === 'moderator' || newUser.role_name === 'admin',
      needsVerification: true
    });
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

// Helper function to generate a mascot image URL based on username
function getMascotImageUrl(username) {
  if (!username) {
    return 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=anonymous';
  }
  
  // Generate Dicebear avatar URL with username as seed
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`;
}

// Update user table setup to include role_id
const setupUserTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Setting up users table...');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Users table does not exist, creating it...');
      // Create users table
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          google_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          photo_url TEXT,
          nickname_changed BOOLEAN DEFAULT FALSE,
          role_id INTEGER DEFAULT 1,
          is_verified BOOLEAN DEFAULT FALSE,
          verification_token TEXT,
          verification_expires TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          last_login TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('Users table created successfully');
    } else {
      console.log('Users table already exists, checking for required columns...');
      
      // Check if nickname_changed column exists
      const nicknameChangedColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'nickname_changed'
        );
      `);
      
      if (!nicknameChangedColumnCheck.rows[0].exists) {
        console.log('Adding nickname_changed column to users table...');
        await client.query(`
          ALTER TABLE users ADD COLUMN nickname_changed BOOLEAN DEFAULT FALSE;
        `);
        console.log('Added nickname_changed column to users table');
      }

      // Check if role_id column exists
      const roleIdColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role_id'
        );
      `);
      
      if (!roleIdColumnCheck.rows[0].exists) {
        console.log('Adding role_id column to users table...');
        await client.query(`
          ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 1;
        `);
        console.log('Added role_id column to users table');
      }
      
      // Check if is_verified column exists
      const isVerifiedColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'is_verified'
        );
      `);
      
      if (!isVerifiedColumnCheck.rows[0].exists) {
        console.log('Adding is_verified column to users table...');
        await client.query(`
          ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        `);
        console.log('Added is_verified column to users table');
      }
      
      // Check if verification_token column exists
      const verificationTokenColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'verification_token'
        );
      `);
      
      if (!verificationTokenColumnCheck.rows[0].exists) {
        console.log('Adding verification_token column to users table...');
        await client.query(`
          ALTER TABLE users ADD COLUMN verification_token TEXT;
        `);
        console.log('Added verification_token column to users table');
      }
      
      // Check if verification_expires column exists
      const verificationExpiresColumnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'verification_expires'
        );
      `);
      
      if (!verificationExpiresColumnCheck.rows[0].exists) {
        console.log('Adding verification_expires column to users table...');
        await client.query(`
          ALTER TABLE users ADD COLUMN verification_expires TIMESTAMP;
        `);
        console.log('Added verification_expires column to users table');
      }
      
      // Ensure the users table has the correct structure
      console.log('Fixing any potential column type issues...');
      
      // Fix id column if needed
      await client.query(`
        ALTER TABLE users 
        ALTER COLUMN id SET DATA TYPE INTEGER, 
        ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);
      `).catch(err => {
        console.log('Note: Could not alter id column, probably already correct:', err.message);
      });
      
      console.log('User table setup complete');
    }
    
    // Setup user_roles table
    await setupUserRolesTable(client);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up users table:', error);
  } finally {
    client.release();
  }
};

// New function to set up user roles table
const setupUserRolesTable = async (client) => {
  try {
    console.log('Setting up user_roles table...');
    
    // Check if user_roles table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_roles'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('user_roles table does not exist, creating it...');
      
      // Create user_roles table
      await client.query(`
        CREATE TABLE user_roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT
        )
      `);
      
      // Insert default roles
      await client.query(`
        INSERT INTO user_roles (name, description) 
        VALUES 
          ('user', 'Regular user with basic permissions'),
          ('moderator', 'Moderator with content management permissions'),
          ('admin', 'Administrator with full system access')
      `);
      
      console.log('user_roles table created and populated successfully');
    } else {
      console.log('user_roles table already exists, ensuring default roles...');
      
      // Ensure default roles exist
      const roles = [
        { name: 'user', description: 'Regular user with basic permissions' },
        { name: 'moderator', description: 'Moderator with content management permissions' },
        { name: 'admin', description: 'Administrator with full system access' }
      ];
      
      for (const role of roles) {
        await client.query(`
          INSERT INTO user_roles (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO NOTHING
        `, [role.name, role.description]);
      }
    }
  } catch (error) {
    console.error('Error setting up user_roles table:', error);
    throw error;
  }
};

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

// Create comment_votes table to track comment votes
const setupCommentVotesTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if comment_votes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comment_votes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create comment_votes table
      await client.query(`
        CREATE TABLE comment_votes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          comment_id INTEGER REFERENCES comments(id),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, comment_id)
        )
      `);
      
      console.log('Comment votes table created successfully');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up comment votes table:', error);
  } finally {
    client.release();
  }
};

// Run the new schema updates
setupCommentsTable().catch(console.error);
setupUserVotesTable().catch(console.error);
setupCommentVotesTable().catch(console.error);

// Update user nickname
app.post('/users/update-nickname', async (req, res) => {
  try {
    const { userId, newNickname } = req.body;

    if (!userId || !newNickname) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'User ID and new nickname are required' });
    }

    if (newNickname.length < 3 || newNickname.length > 30) {
      console.log('Invalid nickname length');
      return res.status(400).json({ error: 'Nickname must be between 3 and 30 characters' });
    }

    // Check if the user exists and if they have already changed their nickname
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userCheck.rows[0];
    
    if (user.nickname_changed) {
      console.log('User already changed nickname');
      return res.status(403).json({ error: 'You can only change your nickname once' });
    }

    // Check if the nickname is already taken
    const nicknameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [newNickname, user.id]
    );

    if (nicknameCheck.rows.length > 0) {
      console.log('Nickname already taken');
      return res.status(409).json({ error: 'This nickname is already taken' });
    }

    // Update the user's nickname
    const result = await pool.query(
      'UPDATE users SET username = $1, display_name = $1, nickname_changed = TRUE WHERE id = $2 RETURNING *',
      [newNickname, user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating nickname');
    // Add more detailed error logging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // Get the user's database ID from their Google ID
    const userCheck = await pool.query('SELECT id FROM users WHERE google_id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const dbUserId = userCheck.rows[0].id;

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
      [id, dbUserId, username, content, parentId || null]
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
      
      // Get the user's database ID from their Google ID
      const userCheck = await client.query('SELECT id FROM users WHERE google_id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      
      const dbUserId = userCheck.rows[0].id;
      
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
        [dbUserId, commentId]
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
          [dbUserId, commentId]
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
          [dbUserId, commentId]
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

// Add a status endpoint for debugging
app.get('/api/status', async (req, res) => {
  try {
    // Check database connection
    const dbConnection = await pool.query('SELECT NOW() as time');
    
    // Check if users table exists
    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists;
    `);
    
    // Check if nickname_changed column exists
    const nicknameColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'nickname_changed'
      ) as exists;
    `);
    
    // Return status information
    res.json({
      status: 'ok',
      time: dbConnection.rows[0].time,
      tables: {
        users: usersTable.rows[0].exists,
        nickname_changed: nicknameColumn.rows[0].exists
      },
      environment: {
        node: process.version,
        port: port
      }
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Make sure both schema setup functions are called at startup
setupMemeTable().catch(console.error);
setupUserTable().catch(console.error);

// Add admin routes for user management
// Get all users with role information (admin only)
app.get('/admin/users', authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch all roles (admin only)
app.get('/admin/roles', authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
app.put('/admin/users/:id/role', authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Don't allow changing own role
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    const result = await pool.query(
      'UPDATE users SET role_id = $1 WHERE id = $2 RETURNING *',
      [roleId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's role and permissions
app.get('/users/me', async (req, res) => {
  const userId = req.headers['user-id'] || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.photo_url, 
             r.name as role
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.google_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Add permission flags
    const isAdmin = user.role === 'admin';
    const isModerator = user.role === 'moderator' || isAdmin;
    
    res.json({
      ...user,
      isAdmin,
      isModerator,
      permissions: {
        canCreateMemes: true, // All users can create memes
        canDeleteMemes: isModerator, // Moderators and admins can delete memes
        canEditMemes: isModerator, // Moderators and admins can edit memes
        canManageUsers: isAdmin, // Only admins can manage users
        canManageRoles: isAdmin // Only admins can manage roles
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email verification endpoint
app.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    // Find user with this verification token
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.verification_token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid verification token' });
    }
    
    const user = result.rows[0];
    
    // Check if token has expired
    if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
      // Generate new token and update expiry time
      const newToken = uuidv4();
      const newExpiryTime = new Date();
      newExpiryTime.setHours(newExpiryTime.getHours() + 24);
      
      await pool.query(
        'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
        [newToken, newExpiryTime, user.id]
      );
      
      // Send new verification email
      await emailService.sendVerificationEmail(user, newToken);
      
      return res.status(400).json({ 
        error: 'Verification token has expired',
        message: 'A new verification email has been sent to your email address'
      });
    }
    
    // Update user as verified and clear verification token
    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
      [user.id]
    );
    
    // Send welcome email
    await emailService.sendWelcomeEmail(user);
    
    // Redirect to frontend with success message
    res.redirect(`${process.env.CLIENT_BASE_URL}/login?verified=true`);
    
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Error verifying email' });
  }
});

// Resend verification email endpoint
app.post('/resend-verification', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Find user by ID
    const result = await pool.query(`
      SELECT * FROM users WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If your account exists in our system, a verification email has been sent' });
    }
    
    const user = result.rows[0];
    
    // If already verified, no need to send
    if (user.is_verified) {
      return res.json({ message: 'Your email is already verified' });
    }
    
    // Generate new token and update expiry time
    const newToken = uuidv4();
    const newExpiryTime = new Date();
    newExpiryTime.setHours(newExpiryTime.getHours() + 24);
    
    await pool.query(
      'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
      [newToken, newExpiryTime, user.id]
    );
    
    // Send new verification email
    await emailService.sendVerificationEmail(user, newToken);
    
    res.json({ message: 'Verification email has been sent' });
    
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Error sending verification email' });
  }
});

// Get user statistics with meme count and total upvotes
app.get('/users/:id/stats', authorize(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get meme count
    const memeCountResult = await pool.query(
      'SELECT COUNT(*) as meme_count FROM memes WHERE user_id = $1',
      [userId]
    );
    
    // Get total upvotes across all memes
    const totalVotesResult = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN votes IS NULL THEN 0 ELSE votes END), 0) as total_votes 
       FROM memes WHERE user_id = $1`,
      [userId]
    );
    
    // Get all memes with their votes
    const memesResult = await pool.query(
      `SELECT id, message as title, 
              COALESCE(votes, 0) as votes, 
              created_at, 
              approval_status 
       FROM memes 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    // Response data
    const stats = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        last_login: user.last_login,
        role_id: user.role_id
      },
      meme_count: parseInt(memeCountResult.rows[0].meme_count),
      total_votes: parseInt(totalVotesResult.rows[0].total_votes) || 0,
      memes: memesResult.rows
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to load user statistics. Please try again.' });
  }
});

// Delete a user and all their content (admin only)
app.delete('/users/:id', authorize(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    // Don't allow admins to delete themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if user exists
    const userCheck = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all meme ids by this user to delete their files
    const memesResult = await client.query('SELECT id, image_url FROM memes WHERE user_id = $1', [id]);
    const memeIds = memesResult.rows.map(meme => meme.id);
    
    // Delete comments on memes by this user
    if (memeIds.length > 0) {
      await client.query(
        'DELETE FROM comments WHERE meme_id = ANY($1::int[])', 
        [memeIds]
      );
    }
    
    // Delete votes on this user's memes
    if (memeIds.length > 0) {
      await client.query(
        'DELETE FROM user_votes WHERE meme_id = ANY($1::int[])', 
        [memeIds]
      );
    }
    
    // Delete all comments by this user
    await client.query('DELETE FROM comments WHERE user_id = $1', [id]);
    
    // Delete all votes by this user
    await client.query('DELETE FROM user_votes WHERE user_id = $1', [id]);
    
    // Delete all memes by this user
    await client.query('DELETE FROM memes WHERE user_id = $1', [id]);
    
    // Delete the user
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    // Delete user's meme image files
    memesResult.rows.forEach(meme => {
      if (meme.image_url) {
        const filePath = path.join(__dirname, meme.image_url);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        }
      }
    });
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({ message: 'User and all associated content successfully deleted' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Use HTTP server with WebSocket support
server.listen(port, () => {
  console.log(`Server running on port ${port} with WebSocket support`);
  
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
  
  // Verify email configuration
  emailService.verifyEmailConfig().then(isConfigValid => {
    if (isConfigValid) {
      console.log('Email service configured correctly');
    } else {
      console.warn('Email service configuration is invalid. Email features will not work.');
    }
  });
});