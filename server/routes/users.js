/**
 * Rute pentru Utilizatori în bossme.me
 * 
 * Acest fișier gestionează rutele pentru utilizatori obișnuiți:
 * - Obținerea informațiilor despre utilizatorul curent
 * - Obținerea meme-urilor utilizatorului curent
 * 
 * Toate rutele folosesc identificatorul unic public_id (UUID)
 * pentru a face aplicația complet agnostică față de metoda de autentificare.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const checkUserStatus = require('../middleware/checkUserStatus');

// Get current user's role and permissions
router.get('/me', checkUserStatus, async (req, res) => {
  try {
    // Utilizăm direct datele din req.user (setat de middleware-ul checkUserStatus)
    const user = req.user;
    
    // Add permission flags
    const isAdmin = user.role_name === 'admin';
    const isModerator = user.role_name === 'moderator' || isAdmin;
    
    res.json({
      id: user.public_id, // Trimitem publicId ca id
      username: user.username,
      email: user.email,
      photo_url: user.photo_url,
      role: user.role_name,
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
    console.error('Error processing user details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all memes for the current user regardless of approval status
router.get('/me/memes', checkUserStatus, async (req, res) => {
  try {
    // Obținem user_id numeric pe baza public_id
    const userResult = await pool.query(
      'SELECT id FROM users WHERE public_id = $1',
      [req.user.public_id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const numericUserId = userResult.rows[0].id;
    
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
    `, [numericUserId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user memes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 