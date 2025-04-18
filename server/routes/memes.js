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
const userQueries = require('../models/user');

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
    const publicId = req.headers['user-id'] || req.query.userId;
    let userRole = 'user';
    
    if (publicId) {
      try {
        // Verifică dacă publicId are format de UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(publicId)) {
          // Obține utilizatorul după public_id
          const user = await userQueries.findByPublicId(publicId);
          if (user) {
            userRole = user.role_name;
          }
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
    
    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }
    
    // Folosim req.user care este deja setat de middleware-ul authorize
    const approverDbId = req.user?.id;
    
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
    
    // Dacă meme-ul a fost aprobat, difuzează-l către toți clienții
    if (status === 'approved') {
      console.log(`Meme #${id} approved by ${req.user.username} (${req.user.public_id}), broadcasting to all clients`);
      broadcastService.broadcastNewMeme(result.rows[0]);
    } else if (status === 'rejected') {
      console.log(`Meme #${id} rejected by ${req.user.username} (${req.user.public_id}). Reason: ${reason || 'No reason provided'}`);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meme approval status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Crearea unui meme nou
router.post('/', upload.single('image'), checkUserStatus, async (req, res) => {
  try {
    const { company, city, message, userId, username } = req.body;
    
    console.log('---DETAILED MEME REQUEST INFO---');
    console.log('- Full request body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    // Validate company name
    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Get user ID if user is authenticated
    let userDbId = null;
    
    if (userId) {
      console.log('- User ID:', userId);
      
      try {
        // Folosim direct publicId (UUID) pentru a găsi utilizatorul
        const user = await pool.query('SELECT id FROM users WHERE public_id = $1', [userId]);
        
        if (user.rows.length > 0) {
          userDbId = user.rows[0].id;
          console.log('- User found in database, id:', userDbId);
        } else {
          console.log('User not found in database with public_id:', userId);
        }
      } catch (error) {
        console.error('Error finding user:', error);
      }
    } else {
      console.log('No user ID provided, meme will be anonymous');
    }
    
    if (!userDbId) {
      console.log('User not found, meme will be anonymous');
    }
    
    // Process the image
    const imagePath = req.file.path;
    const relativePath = path.relative(path.join(__dirname, '..'), imagePath);
    const imageUrl = `/${relativePath.replace(/\\/g, '/')}`;
    
    // Insert into database - toate meme-urile au status 'pending' indiferent dacă utilizatorul este autentificat sau nu
    const result = await pool.query(
      `INSERT INTO memes (image_url, company, city, message, user_id, username, approval_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING *`,
      [
        imageUrl, 
        company, 
        city || 'Unknown', 
        message || '', 
        userDbId, 
        username || 'Anonymous',
        'pending' // Toate meme-urile trebuie aprobate, indiferent dacă utilizatorul este autentificat
      ]
    );
    
    const newMeme = result.rows[0];
    
    // Mesaj de confirmare specific pentru meme-uri în așteptare
    res.status(201).json({
      ...newMeme,
      message: 'Meme-ul a fost trimis cu succes și va fi vizibil după ce va fi aprobat de administratori.'
    });
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a meme
router.post('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, voteType } = req.body;
    
    console.log('Processing meme vote:');
    console.log('- Meme ID:', id);
    console.log('- User ID:', userId);
    console.log('- Vote Type:', voteType);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to vote' });
    }
    
    // Acceptăm doar 'up' (adaugă vot) sau 'down' (elimină votul)
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "up" or "down"' });
    }
    
    // Verificăm dacă userId este un UUID valid
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Găsim utilizatorul după public_id
    const userCheck = await pool.query(
      'SELECT id, is_deleted FROM users WHERE public_id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated and cannot perform this action.'
      });
    }
    
    // Obține ID-ul numeric al utilizatorului din baza de date
    const dbUserId = userCheck.rows[0].id;
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
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
        
        // Record the user's vote (vote_type este întotdeauna 1 pentru upvote)
        await client.query(
          'INSERT INTO user_votes (user_id, meme_id, vote_type) VALUES ($1, $2, $3)',
          [dbUserId, id, 1] // 1 for upvote
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
        // User wants to remove vote (unvote)
        if (voteCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'You have not voted for this meme yet' });
        }
        
        // Remove the user's vote
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
    console.error('Error voting on meme:', error);
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
    const publicId = req.header('user-id');
    
    // Obține meme-ul
    const result = await pool.query('SELECT * FROM memes WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }
    
    const meme = result.rows[0];
    
    // Verifică permisiunile pentru meme-uri care nu sunt aprobate
    if (meme.approval_status !== 'approved') {
      // Dacă nu există user ID, nu are acces
      if (!publicId) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to view this meme'
        });
      }
      
      // Verificăm dacă publicId are format de UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(publicId)) {
        return res.status(400).json({ error: 'Invalid user ID format' });
      }
      
      // Verifică dacă utilizatorul este admin/moderator sau creatorul meme-ului
      const user = await userQueries.findByPublicId(publicId);
      
      if (!user) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to view this meme'
        });
      }
      
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
    console.error(`Error fetching meme ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 