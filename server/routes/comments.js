const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authorize } = require('../middleware/auth');
const checkUserStatus = require('../middleware/checkUserStatus');
const { PROVIDERS } = require('../models/user');

// Get comments for a meme
router.get('/:memeId/comments', async (req, res) => {
  try {
    const { memeId } = req.params;
    
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
    
    // Actualizare query pentru a include auth_provider_user_id-ul utilizatorului
    let query = `
      SELECT c.*, u.auth_provider_id, u.auth_provider_user_id, ap.name as auth_provider_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
      WHERE c.meme_id = $1 
      ORDER BY c.votes DESC, c.created_at DESC
    `;
    
    if (!columnCheck.rows[0].exists) {
      console.log('Warning: parent_id column does not exist in comments table');
    }
    
    const result = await pool.query(query, [memeId]);
    
    // Transform the results to ensure parent_id property is properly named for frontend
    const comments = result.rows.map(comment => {
      // Convert parent_id to parentId for consistent naming in frontend
      // și includem auth_provider_user_id ca owner_id pentru a permite verificarea proprietarului comentariului în frontend
      const { parent_id, auth_provider_user_id, auth_provider_name, ...rest } = comment;
      return {
        ...rest,
        parentId: parent_id,
        owner_id: auth_provider_user_id,  // Folosim ID-ul extern din provider pentru compatibilitate
        auth_provider: auth_provider_name // Adăugăm și numele provider-ului
      };
    });
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a comment to a meme
router.post('/:memeId/comments', async (req, res) => {
  try {
    const { memeId } = req.params;
    const { userId, content, username, parentId, authProvider = PROVIDERS.GOOGLE } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    console.log('Comment request with username from client:', username);
    
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
    const memeCheck = await pool.query('SELECT id FROM memes WHERE id = $1', [memeId]);
    if (memeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    // Obține ID-ul provider-ului
    const providerResult = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
    if (providerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown authentication provider' });
    }
    const providerId = providerResult.rows[0].id;

    // Obține ID-ul numeric al utilizatorului și username-ul actual din baza de date
    const userCheck = await pool.query(
      'SELECT id, username, is_deleted FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', 
      [providerId, userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verifică dacă utilizatorul este marcat ca șters
    if (userCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account is deactivated', 
        message: 'Your account has been deactivated and cannot post new comments.'
      });
    }
    
    // Folosim ID-ul numeric intern din baza de date și username-ul actual
    const dbUserId = userCheck.rows[0].id;
    const currentUsername = userCheck.rows[0].username;
    
    console.log('Using username from database:', currentUsername);

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
      [memeId, dbUserId, currentUsername, content, parentId || null]
    );
    
    // Adăugăm owner_id și auth_provider în răspuns pentru a putea afișa butonul de ștergere imediat
    const commentWithOwnerId = {
      ...result.rows[0],
      owner_id: userId,
      auth_provider: authProvider
    };
    
    res.status(201).json(commentWithOwnerId);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on a comment
router.post('/:memeId/comments/:commentId/vote', async (req, res) => {
  try {
    const { memeId, commentId } = req.params;
    const { userId, voteType, authProvider = PROVIDERS.GOOGLE } = req.body;
    
    console.log('Processing comment vote:');
    console.log('- Meme ID:', memeId);
    console.log('- Comment ID:', commentId);
    console.log('- User ID:', userId);
    console.log('- Auth Provider:', authProvider);
    console.log('- Vote Type:', voteType);
    
    if (!userId) {
      console.log('Authentication error: No userId provided');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Trebuie să fiți autentificat pentru a vota comentarii.'
      });
    }
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      console.log('Invalid vote type:', voteType);
      return res.status(400).json({ 
        error: 'Invalid vote type',
        message: 'Tipul de vot trebuie să fie "up" sau "down".'
      });
    }
    
    // Obține ID-ul provider-ului
    const providerResult = await pool.query('SELECT id FROM auth_providers WHERE name = $1', [authProvider]);
    if (providerResult.rows.length === 0) {
      return res.status(400).json({ error: 'Unknown authentication provider' });
    }
    const providerId = providerResult.rows[0].id;
    
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
      
      // Găsim ID-ul numeric al utilizatorului
      console.log('Looking up numeric user ID for Provider ID:', providerId, 'and User ID:', userId);
      const userCheck = await client.query(
        'SELECT id FROM users WHERE auth_provider_id = $1 AND auth_provider_user_id = $2', 
        [providerId, userId]
      );
      
      if (userCheck.rows.length === 0) {
        console.log('User not found in database.');
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'User not found',
          message: 'Utilizatorul nu a fost găsit. Vă rugăm să vă autentificați din nou.'
        });
      }
      
      const numericUserId = userCheck.rows[0].id;
      console.log('Found numeric user ID:', numericUserId);
      
      // Verifică dacă comentariul există
      const commentCheck = await client.query('SELECT id FROM comments WHERE id = $1 AND meme_id = $2', [commentId, memeId]);
      if (commentCheck.rows.length === 0) {
        console.log('Comment not found.');
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Comment not found',
          message: 'Comentariul nu a fost găsit sau a fost șters.'
        });
      }
      
      // Verifică dacă utilizatorul a votat deja acest comentariu
      const voteCheck = await client.query(
        'SELECT * FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
        [numericUserId, commentId]
      );
      
      // Convert voteType to numeric value
      const voteValue = voteType === 'up' ? 1 : -1;
      
      if (voteCheck.rows.length > 0) {
        // Utilizatorul a votat deja acest comentariu
        const existingVote = voteCheck.rows[0];
        
        if (existingVote.vote_type === voteValue) {
          // Dacă votează în același fel, anulează votul
          await client.query(
            'DELETE FROM comment_votes WHERE id = $1',
            [existingVote.id]
          );
          
          // Actualizare scor comentariu
          await client.query(
            'UPDATE comments SET votes = votes - $1 WHERE id = $2',
            [existingVote.vote_type, commentId]
          );
          
          await client.query('COMMIT');
          console.log('Vote removed successfully.');
          
          return res.json({
            message: 'Vote removed successfully',
            voteType: null
          });
        } else {
          // Dacă votează diferit, actualizează votul
          await client.query(
            'UPDATE comment_votes SET vote_type = $1, created_at = NOW() WHERE id = $2',
            [voteValue, existingVote.id]
          );
          
          // Actualizare scor comentariu (schimbare de 2 puncte: -1 -> +1 sau +1 -> -1)
          await client.query(
            'UPDATE comments SET votes = votes + $1 WHERE id = $2',
            [2 * voteValue, commentId]
          );
          
          await client.query('COMMIT');
          console.log('Vote changed successfully to:', voteType);
          
          return res.json({
            message: 'Vote changed successfully',
            voteType: voteType
          });
        }
      } else {
        // Utilizatorul nu a votat încă, adaugă vot nou
        await client.query(
          'INSERT INTO comment_votes (user_id, comment_id, vote_type) VALUES ($1, $2, $3)',
          [numericUserId, commentId, voteValue]
        );
        
        // Actualizare scor comentariu
        await client.query(
          'UPDATE comments SET votes = votes + $1 WHERE id = $2',
          [voteValue, commentId]
        );
        
        await client.query('COMMIT');
        console.log('Vote added successfully:', voteType);
        
        return res.json({
          message: 'Vote added successfully',
          voteType: voteType
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing vote:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'A apărut o eroare la procesarea votului. Vă rugăm să încercați din nou.'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing vote request:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'A apărut o eroare la procesarea cererii. Vă rugăm să încercați din nou.'
    });
  }
});

// Delete a comment
router.delete('/:memeId/comments/:commentId', async (req, res) => {
  try {
    const { memeId, commentId } = req.params;
    const { userId, authProvider = PROVIDERS.GOOGLE } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Trebuie să fiți autentificat pentru a șterge comentarii.'
      });
    }
    
    // Verifică dacă utilizatorul este anonimizat/marcat ca șters
    const userStatusCheck = await pool.query(
      'SELECT is_deleted FROM users WHERE auth_provider_id = (SELECT id FROM auth_providers WHERE name = $1) AND auth_provider_user_id = $2',
      [authProvider, userId]
    );
    
    if (userStatusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userStatusCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'Contul tău a fost dezactivat și nu poate efectua această acțiune.'
      });
    }
    
    // Verifică dacă comentariul există și dacă utilizatorul este proprietarul
    const commentCheck = await pool.query(
      `SELECT c.*, u.auth_provider_id, u.auth_provider_user_id, ap.name as auth_provider_name
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id 
       WHERE c.id = $1 AND c.meme_id = $2`,
      [commentId, memeId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Comment not found',
        message: 'Comentariul nu a fost găsit sau a fost șters deja.'
      });
    }
    
    const comment = commentCheck.rows[0];
    
    // Verifică dacă utilizatorul este proprietarul sau admin
    const userCheck = await pool.query(
      `SELECT u.id, u.auth_provider_user_id, u.username, r.name as role
       FROM users u
       LEFT JOIN user_roles r ON u.role_id = r.id
       LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
       WHERE ap.name = $1 AND u.auth_provider_user_id = $2`,
      [authProvider, userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Unauthorized', 
        message: 'Nu aveți permisiunea de a șterge acest comentariu.'
      });
    }
    
    const user = userCheck.rows[0];
    const isAdmin = user.role === 'admin';
    const isModerator = user.role === 'moderator' || user.role === 'admin';
    
    // Verifică dacă utilizatorul are dreptul să șteargă comentariul
    if (comment.auth_provider_user_id !== userId && !isAdmin && !isModerator) {
      return res.status(403).json({ 
        error: 'Unauthorized', 
        message: 'Nu puteți șterge comentariul altcuiva.'
      });
    }
    
    // Ștergem comentariul logic (marcăm ca șters)
    await pool.query(
      'UPDATE comments SET is_deleted = TRUE WHERE id = $1',
      [commentId]
    );
    
    res.json({ 
      message: 'Comment deleted successfully',
      commentId: commentId
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'A apărut o eroare la ștergerea comentariului. Vă rugăm să încercați din nou.'
    });
  }
});

module.exports = router; 