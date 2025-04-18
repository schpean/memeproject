/**
 * Rute pentru Comentarii în bossme.me
 * 
 * Acest fișier gestionează toate rutele pentru comentarii:
 * - Obținerea comentariilor pentru un meme
 * - Adăugarea unui comentariu nou
 * - Votarea comentariilor
 * - Ștergerea comentariilor
 * 
 * Folosește exclusiv public_id (UUID) pentru identificarea utilizatorilor
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authorize } = require('../middleware/auth');
const checkUserStatus = require('../middleware/checkUserStatus');
const userQueries = require('../models/user');

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
    
    // Query actualizat pentru a returna public_id în loc de auth_provider_id și auth_provider_user_id
    let query = `
      SELECT c.*, u.public_id as owner_public_id, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
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
      const { parent_id, owner_public_id, ...rest } = comment;
      return {
        ...rest,
        parentId: parent_id,
        owner_id: owner_public_id  // Folosim public_id ca owner_id pentru verificarea proprietarului în frontend
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
    const { userId, content, username, parentId } = req.body;
    
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

    // Verificăm dacă userId are format de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Obține utilizatorul după public_id
    const user = await userQueries.findByPublicId(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verifică dacă utilizatorul este marcat ca șters
    if (user.is_deleted) {
      return res.status(403).json({ 
        error: 'Account is deactivated', 
        message: 'Your account has been deactivated and cannot post new comments.'
      });
    }
    
    // Folosim ID-ul numeric intern din baza de date și username-ul actual
    const dbUserId = user.id;
    const currentUsername = user.username;
    
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
    
    // Adăugăm owner_id în răspuns pentru a putea afișa butonul de ștergere imediat
    const commentWithOwnerId = {
      ...result.rows[0],
      owner_id: userId  // Folosim public_id ca owner_id
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
    const { userId, voteType } = req.body;
    
    console.log('Processing comment vote:');
    console.log('- Meme ID:', memeId);
    console.log('- Comment ID:', commentId);
    console.log('- User ID:', userId);
    console.log('- Vote Type:', voteType);
    
    if (!userId) {
      console.log('Authentication error: No userId provided');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Trebuie să fiți autentificat pentru a vota comentarii.'
      });
    }
    
    // Acceptăm doar 'up' (adaugă vot) sau 'down' (elimină votul)
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      console.log('Invalid vote type:', voteType);
      return res.status(400).json({ 
        error: 'Invalid vote type',
        message: 'Tipul de vot trebuie să fie "up" sau "down".'
      });
    }
    
    // Verificăm dacă userId are format de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Obține utilizatorul după public_id
    const user = await userQueries.findByPublicId(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verifică dacă utilizatorul este marcat ca șters
    if (user.is_deleted) {
      return res.status(403).json({ 
        error: 'Account is deactivated', 
        message: 'Your account has been deactivated and cannot vote on comments.'
      });
    }
    
    // Verifică dacă comentariul există
    const commentCheck = await pool.query('SELECT id FROM comments WHERE id = $1', [commentId]);
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Convertim UUID în ID-ul numeric intern
    const dbUserId = user.id;
    
    // Verifică dacă utilizatorul a votat deja acest comentariu
    const voteCheck = await pool.query(
      'SELECT * FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
      [dbUserId, commentId]
    );
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Valoarea pentru vote_type este 1 (pozitivă) deoarece nu avem downvote real
      const voteValue = 1;
      
      if (voteType === 'up') {
        // User wants to upvote
        if (voteCheck.rows.length > 0) {
          // User already voted
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: 'Already voted',
            message: 'Ai votat deja acest comentariu.'
          });
        }
        
        // Record the vote
        await client.query(
          'INSERT INTO comment_votes (user_id, comment_id, vote_type) VALUES ($1, $2, $3)',
          [dbUserId, commentId, voteValue]
        );
        
        // Increment comment votes
        const result = await client.query(
          'UPDATE comments SET votes = votes + 1 WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query('COMMIT');
        
        // Include the owner_id in the response
        const updatedComment = {
          ...result.rows[0],
          owner_id: result.rows[0].user_id === user.id ? userId : null
        };
        
        res.json(updatedComment);
      } else {
        // User wants to remove vote (unvote)
        if (voteCheck.rows.length === 0) {
          // User has not voted yet
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: 'Not voted',
            message: 'Nu ai votat încă acest comentariu.'
          });
        }
        
        // Remove the vote
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
        
        // Include the owner_id in the response
        const updatedComment = {
          ...result.rows[0],
          owner_id: result.rows[0].user_id === user.id ? userId : null
        };
        
        res.json(updatedComment);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing comment vote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a comment
router.delete('/:memeId/comments/:commentId', async (req, res) => {
  try {
    const { memeId, commentId } = req.params;
    // Acceptăm userId din body sau din headers
    const userId = req.header('user-id') || (req.body && req.body.userId);
    
    console.log(`Deleting comment request - memeId: ${memeId}, commentId: ${commentId}, userId: ${userId}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verificăm dacă userId are format de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.log(`Invalid UUID format: ${userId}`);
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    // Obține utilizatorul după public_id
    const user = await userQueries.findByPublicId(userId);
    
    if (!user) {
      console.log(`User not found with public_id: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`User found: ID=${user.id}, username=${user.username}, role=${user.role_name}`);
    
    // Check if comment exists
    const commentCheck = await pool.query('SELECT * FROM comments WHERE id = $1 AND meme_id = $2', [commentId, memeId]);
    
    if (commentCheck.rows.length === 0) {
      console.log(`Comment not found: commentId=${commentId}, memeId=${memeId}`);
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const comment = commentCheck.rows[0];
    console.log(`Comment found: ID=${comment.id}, user_id=${comment.user_id}, content="${comment.content.substring(0, 30)}..."`);
    
    // Check if user is the comment owner or admin/moderator
    const isAdmin = user.role_name === 'admin';
    const isModerator = user.role_name === 'moderator';
    const isOwner = Number(comment.user_id) === Number(user.id);
    
    console.log(`Permission check: isAdmin=${isAdmin}, isModerator=${isModerator}, isOwner=${isOwner}`);
    console.log(`Comment user_id: ${comment.user_id} (${typeof comment.user_id}), Current user.id: ${user.id} (${typeof user.id})`);
    
    if (!isAdmin && !isModerator && !isOwner) {
      console.log(`Permission denied for user ${userId} to delete comment ${commentId}`);
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    // Determine the appropriate message based on who deleted the comment
    let deletionMessage = 'Comentariul a fost șters';
    if (isAdmin || isModerator) {
      deletionMessage = 'Comentariul a fost șters de către administrator/moderator';
    } else if (isOwner) {
      deletionMessage = 'Comentariul a fost șters de către utilizator';
    }
    
    // Instead of deleting, update the comment to show a placeholder message
    await pool.query(
      'UPDATE comments SET content = $1, is_deleted = TRUE WHERE id = $2',
      [deletionMessage, commentId]
    );
    
    // Log successful soft deletion
    console.log(`Comment ${commentId} marked as deleted by user ${userId} (${user.username})`);
    
    // Return the updated comment
    const updatedComment = {
      ...comment,
      content: deletionMessage,
      is_deleted: true,
      owner_id: userId
    };
    
    res.json({ 
      success: true, 
      message: 'Comment deleted successfully',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 