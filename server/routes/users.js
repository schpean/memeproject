/**
 * Rute pentru Utilizatori în bossme.me
 * 
 * Acest fișier gestionează rutele pentru utilizatori obișnuiți:
 * - Obținerea informațiilor despre utilizatorul curent
 * - Obținerea meme-urilor utilizatorului curent
 * 
 * Toate rutele necesită autentificare
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const checkUserStatus = require('../middleware/checkUserStatus');

// Get current user's role and permissions
router.get('/me', checkUserStatus, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.photo_url, 
             r.name as role
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [req.numericUserId]);
    
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

// Get all memes for the current user regardless of approval status
router.get('/me/memes', checkUserStatus, async (req, res) => {
  try {
    // Obține toate meme-urile utilizatorului, indiferent de status
    const result = await pool.query(`
      SELECT m.*, 
             COALESCE(u.username, 'Unknown') as approved_by_username,
             (CASE 
                WHEN m.approval_status = 'rejected' THEN m.rejection_reason 
                ELSE NULL 
              END) as rejection_reason
      FROM memes m
      LEFT JOIN users u ON m.approved_by = u.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC
    `, [req.numericUserId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 