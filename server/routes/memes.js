const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { authorize } = require('../middleware/auth');
const checkUserStatus = require('../middleware/checkUserStatus');
const broadcastService = require('../websocket/broadcastService');
const { PROVIDERS } = require('../models/user');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all memes or filter by company or city
router.get('/', async (req, res) => {
  try {
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
    const authProvider = req.headers['auth-provider'] || req.query.authProvider || PROVIDERS.GOOGLE;
    let userRole = 'user';
    
    if (userId) {
      try {
        const userResult = await pool.query(`
          SELECT u.*, r.name as role_name 
          FROM users u
          LEFT JOIN user_roles r ON u.role_id = r.id
          LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
          WHERE u.auth_provider_user_id = $1 AND ap.name = $2
        `, [userId, authProvider]);
        
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

// Get pending memes for approval (admin and moderator only)
router.get('/pending', authorize(['admin', 'moderator']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, 
             COALESCE(u.username, 'Unknown') as approved_by_username
      FROM memes m
      LEFT JOIN users u ON m.approved_by = u.id
      WHERE m.approval_status = $1 
      ORDER BY m.created_at ASC
    `, ['pending']);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting pending memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve or reject a meme
router.put('/:id/approval', authorize(['admin', 'moderator']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.header('user-id');
    const authProvider = req.header('auth-provider') || PROVIDERS.GOOGLE;

    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }
    
    // Get the user's numeric ID
    let approverDbId = null;
    if (userId) {
      // Get the auth provider ID first
      const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
      if (providerQuery.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid authentication provider' });
      }
      const providerId = providerQuery.rows[0].id;
      
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', 
        [providerId, userId]
      );
      if (userCheck.rows.length > 0) {
        approverDbId = userCheck.rows[0].id;
      }
    }
    
    // Update meme approval status
    let result;
    if (approverDbId) {
      result = await pool.query(
        'UPDATE memes SET approval_status = $1, rejection_reason = $2, approved_by = $3, approved_at = NOW() WHERE id = $4 RETURNING *',
        [status, reason || null, approverDbId, id]
      );
    } else {
      result = await pool.query(
        'UPDATE memes SET approval_status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
        [status, reason || null, id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meme approval status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle meme uploads - supports both FormData and JSON requests
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Determine request type
    const isFormData = req.file !== undefined;
    console.log('---DETAILED MEME REQUEST INFO---');
    console.log('- Full request body:', req.body);
    
    let company, city, message, imageUrl, userId, username, authProvider;
    
    if (isFormData) {
      // Handle FormData upload with file
      company = req.body.company;
      city = req.body.city;
      message = req.body.message;
      imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      userId = req.body.userId;
      username = req.body.username; // Vom suprascrie acest username cu cel din baza de date
      authProvider = req.body.authProvider || PROVIDERS.GOOGLE;
    } else {
      // Handle JSON request with URL
      const body = req.body;
      company = body.company;
      city = body.city;
      message = body.message;
      imageUrl = body.image_url;
      userId = body.userId;
      username = body.username; // Vom suprascrie acest username cu cel din baza de date
      authProvider = body.authProvider || PROVIDERS.GOOGLE;
    }
    
    // Detailed debug info
    console.log('- Company:', company);
    console.log('- City:', city);
    console.log('- Has image:', !!imageUrl);
    console.log('- Image URL:', imageUrl);
    console.log('- Message:', message);
    console.log('- User ID:', userId);
    console.log('- Auth Provider:', authProvider);
    console.log('- Username trimis de client:', username);

    // Validate required fields
    if (!company || (company !== 'bossme.me' && !city)) {
      console.log('- Company present:', !!company);
      console.log('- City present:', !!city);
      return res.status(400).json({ error: 'Company and city are required' });
    }
    
    // Obține ID-ul numeric al utilizatorului din baza de date și username-ul actual
    let dbUserId = null;
    let currentUsername = 'anonymous';
    
    if (userId) {
      try {
        // Get the auth provider ID first
        const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
        if (providerQuery.rows.length === 0) {
          console.log('Auth provider not found, meme will be anonymous');
        } else {
          const providerId = providerQuery.rows[0].id;
          
          const userCheck = await pool.query('SELECT id, username, is_deleted FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', [providerId, userId]);
          if (userCheck.rows.length > 0) {
            // Verifică dacă utilizatorul este marcat ca șters
            if (userCheck.rows[0].is_deleted) {
              return res.status(403).json({ 
                error: 'Account is deactivated', 
                message: 'Your account has been deactivated and cannot post new content.'
              });
            }
            
            dbUserId = userCheck.rows[0].id;
            currentUsername = userCheck.rows[0].username;
            console.log('Found numeric user ID:', dbUserId);
            console.log('Found current username from database:', currentUsername);
          } else {
            console.log('User not found, meme will be anonymous');
          }
        }
      } catch (userError) {
        console.error('Error finding user:', userError);
        // Continuăm fără user ID dacă utilizatorul nu este găsit
      }
    }

    // Check if uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    console.log('Inserting meme into database with parameters:');
    console.log('- Company:', company);
    console.log('- City:', city);
    console.log('- Image URL:', imageUrl);
    console.log('- Message:', message || null);
    console.log('- User ID (numeric):', dbUserId);
    console.log('- Username (from database):', currentUsername);
    
    try {
      // Check if user is admin or moderator - their posts are auto-approved
      let approvalStatus = 'pending';
      try {
        // Get the auth provider ID first
        const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
        if (providerQuery.rows.length > 0) {
          const providerId = providerQuery.rows[0].id;
          
          const userResult = await pool.query(`
            SELECT u.*, r.name as role_name 
            FROM users u
            LEFT JOIN user_roles r ON u.role_id = r.id
            WHERE u.auth_provider_id = $1 AND u.auth_provider_user_id = $2
          `, [providerId, userId]);
          
          if (userResult.rows.length > 0 && 
             (userResult.rows[0].role_name === 'admin' || userResult.rows[0].role_name === 'moderator')) {
            approvalStatus = 'approved';
          }
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
          dbUserId, // Folosim ID-ul numeric intern
          currentUsername, // Folosim întotdeauna numele din baza de date
          approvalStatus
        ]
      );
      console.log('Meme creation successful, returning result');
      
      // Broadcast the new meme to all connected clients
      if (result.rows.length > 0) {
        const newMeme = result.rows[0];
        broadcastService.broadcast('newMeme', newMeme);
      }
      
      res.status(201).json(result.rows[0]);
      
      // Actualizează contorul utilizatorului
      if (userId) {
        // Get the auth provider ID first
        const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
        if (providerQuery.rows.length > 0) {
          const providerId = providerQuery.rows[0].id;
          
          await pool.query(
            'UPDATE users SET meme_count = meme_count + 1 WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', 
            [providerId, userId]
          );
        }
      }
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
              dbUserId, // Folosim ID-ul numeric intern
              currentUsername
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
router.post('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, voteType, authProvider = PROVIDERS.GOOGLE } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
    }
    
    // Get the auth provider ID
    const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
    if (providerQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid authentication provider' });
    }
    const providerId = providerQuery.rows[0].id;
    
    // Verificăm dacă utilizatorul este anonimizat/marcat ca șters
    const userStatusCheck = await pool.query(
      'SELECT is_deleted FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2',
      [providerId, userId]
    );
    
    if (userStatusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userStatusCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated and cannot perform this action.'
      });
    }
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Obține ID-ul numeric al utilizatorului din baza de date
      const userCheck = await client.query(
        'SELECT id FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', 
        [providerId, userId]
      );
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Folosim ID-ul numeric intern din baza de date
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
          'INSERT INTO user_votes (user_id, meme_id, vote_type) VALUES ($1, $2, $3)',
          [dbUserId, id, voteType === 'up' ? 1 : -1]
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
        broadcastService.broadcast('memeUpdated', result.rows[0]);
        
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
        broadcastService.broadcast('memeUpdated', result.rows[0]);
        
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
router.get('/top', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM memes ORDER BY votes DESC LIMIT 10');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single meme by ID with detailed information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.header('user-id');
    const authProvider = req.header('auth-provider') || PROVIDERS.GOOGLE;
    
    // Obține meme-ul
    const result = await pool.query('SELECT * FROM memes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    const meme = result.rows[0];
    
    // Verifică permisiunile pentru meme-uri care nu sunt aprobate
    if (meme.approval_status !== 'approved') {
      // Dacă nu există user ID, nu are acces
      if (!userId) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to view this meme'
        });
      }
      
      // Get the auth provider ID
      const providerQuery = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
      if (providerQuery.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid authentication provider' });
      }
      const providerId = providerQuery.rows[0].id;
      
      // Verifică dacă utilizatorul este admin/moderator sau creatorul meme-ului
      const userCheck = await pool.query(`
        SELECT u.id, u.role_id, r.name as role_name
        FROM users u
        LEFT JOIN user_roles r ON u.role_id = r.id
        WHERE u.auth_provider_id = $1 AND u.auth_provider_user_id = $2
      `, [providerId, userId]);
      
      if (userCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to view this meme'
        });
      }
      
      const user = userCheck.rows[0];
      const isAdminOrMod = user.role_name === 'admin' || user.role_name === 'moderator';
      const isCreator = meme.user_id && user.id === meme.user_id;
      
      // Dacă utilizatorul nu este nici admin/moderator, nici creatorul meme-ului, nu are acces
      if (!isAdminOrMod && !isCreator) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to view this meme'
        });
      }
    }
    
    // Try to get comment count, but don't fail if comments table doesn't exist
    try {
      const commentCountResult = await pool.query(
        'SELECT COUNT(*) FROM comments WHERE meme_id = $1',
        [id]
      );
      
      meme.comment_count = parseInt(commentCountResult.rows[0].count);
      
      res.json(meme);
    } catch (error) {
      // If the comments table doesn't exist, just return the meme without comment count
      console.log('Comments functionality not available yet');
      res.json(meme);
    }
  } catch (error) {
    console.error(`Error fetching meme ${id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 