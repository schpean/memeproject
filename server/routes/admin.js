/**
 * Rute Administrative pentru bossme.me
 * 
 * Acest fișier gestionează toate rutele administrative:
 * - Gestionarea utilizatorilor
 * - Gestionarea rolurilor
 * - Statistici utilizatori
 * - Ștergere utilizatori
 * 
 * Toate rutele necesită autentificare și rolul de admin
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authorize } = require('../middleware/auth');

// Get all users with role information (admin only)
router.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE (u.is_deleted IS NULL OR u.is_deleted = FALSE)
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch all roles (admin only)
router.get('/roles', authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', authorize(['admin']), async (req, res) => {
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

// Get user statistics with meme count and total upvotes
router.get('/users/:id/stats', authorize(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificăm dacă avem user ID în header pentru autorizare
    if (!req.header('user-id')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Setăm explicit header-ul Content-Type
    res.setHeader('Content-Type', 'application/json');
    
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
    
    // Get all memes with their votes and approver info
    const memesResult = await pool.query(
      `SELECT m.id, m.message as title, 
              COALESCE(m.votes, 0) as votes, 
              m.created_at, 
              m.approval_status,
              m.approved_at,
              u.username as approved_by_username
       FROM memes m
       LEFT JOIN users u ON m.approved_by = u.id 
       WHERE m.user_id = $1 
       ORDER BY m.created_at DESC`,
      [userId]
    );
    
    // Response data
    const stats = {
      user,
      meme_count: parseInt(memeCountResult.rows[0].meme_count),
      total_votes: parseInt(totalVotesResult.rows[0].total_votes),
      memes: memesResult.rows
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a user and all their content (admin only)
router.delete('/users/:id', authorize(['admin']), async (req, res) => {
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
    
    // Verifică dacă coloana is_deleted există în tabelul users
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_deleted'
    `);
    
    // Dacă coloana nu există, o creăm
    if (columnCheck.rows.length === 0) {
      await client.query('ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE');
    }
    
    // Generăm un username anonimizat pentru utilizator
    const anonUsername = `deleted_user_${id}`;
    
    // Actualizăm utilizatorul în loc să-l ștergem
    // - Marcăm ca șters (is_deleted = true)
    // - Anonimizăm datele personale (email, username)
    // - Păstrăm id-ul și alte informații pentru referințe
    await client.query(`
      UPDATE users 
      SET is_deleted = TRUE, 
          username = $1, 
          display_name = $1,
          email = $2,
          photo_url = NULL
      WHERE id = $3
    `, [anonUsername, `deleted_${id}@deleted.user`, id]);
    
    // Actualizăm și username-ul în meme-uri și comentarii pentru consistent UI
    await client.query(`
      UPDATE memes 
      SET username = $1
      WHERE user_id = $2
    `, [anonUsername, id]);
    
    await client.query(`
      UPDATE comments 
      SET username = $1
      WHERE user_id = $2
    `, [anonUsername, id]);
    
    await client.query('COMMIT');
    
    res.json({ 
      message: 'User has been marked as deleted and anonymized successfully',
      username: anonUsername
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error soft-deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 