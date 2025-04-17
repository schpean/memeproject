const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authorize } = require('../middleware/auth');
const checkUserStatus = require('../middleware/checkUserStatus');

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
    
    // Actualizare query pentru a include google_id-ul utilizatorului
    let query = `
      SELECT c.*, u.google_id
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
      // și includem google_id ca owner_id pentru a permite verificarea proprietarului comentariului în frontend
      const { parent_id, google_id, ...rest } = comment;
      return {
        ...rest,
        parentId: parent_id,
        owner_id: google_id  // Adăugăm owner_id care va fi Google ID-ul utilizatorului
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

    // Obține ID-ul numeric al utilizatorului și username-ul actual din baza de date
    const userCheck = await pool.query('SELECT id, username, is_deleted FROM users WHERE google_id = $1', [userId]);
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
    
    // Adăugăm owner_id (google_id) în răspuns pentru a putea afișa butonul de ștergere imediat
    const commentWithOwnerId = {
      ...result.rows[0],
      owner_id: userId // Adăugăm google_id-ul ca owner_id în răspuns
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
    
    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      console.log('Invalid vote type:', voteType);
      return res.status(400).json({ 
        error: 'Invalid vote type',
        message: 'Tipul de vot trebuie să fie "up" sau "down".'
      });
    }
    
    // Verificăm dacă utilizatorul este anonimizat/marcat ca șters
    const userStatusCheck = await pool.query(
      'SELECT is_deleted FROM users WHERE google_id = $1',
      [userId]
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
      console.log('Looking up numeric user ID for Google ID:', userId);
      const userCheck = await client.query('SELECT id FROM users WHERE google_id = $1', [userId]);
      
      if (userCheck.rows.length === 0) {
        console.log('User not found in database.');
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'User not found', 
          message: 'Trebuie să vă autentificați din nou pentru a vota comentarii.'
        });
      }
      
      // ID-ul numeric intern din baza de date
      const dbUserId = userCheck.rows[0].id;
      console.log('Found numeric user ID:', dbUserId);
      
      // Verifică dacă comentariul există
      console.log('Checking if comment exists:', commentId, 'for meme:', memeId);
      const commentCheck = await client.query(
        'SELECT * FROM comments WHERE id = $1 AND meme_id = $2',
        [commentId, memeId]
      );
      
      if (commentCheck.rows.length === 0) {
        console.log('Comment not found');
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          error: 'Comment not found',
          message: 'Comentariul căutat nu există.' 
        });
      }
      
      const currentComment = commentCheck.rows[0];
      console.log('Current comment vote count:', currentComment.votes);
      
      // Verifică dacă utilizatorul a votat deja comentariul
      console.log('Checking existing votes');
      const voteCheck = await client.query(
        'SELECT id FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
        [dbUserId, commentId]
      );
      
      const hasExistingVote = voteCheck.rows.length > 0;
      console.log('User has existing vote:', hasExistingVote);
      
      // Determinăm ce operație facem în funcție de voteType și starea existentă
      if (voteType === 'up') {
        // Utilizatorul vrea să adauge un vot
        if (hasExistingVote) {
          // Utilizatorul a votat deja, deci nu facem nicio schimbare
          console.log('User already voted for this comment, returning current state');
          await client.query('COMMIT');
          return res.json(currentComment);
        }
        
        // Înregistrăm votul utilizatorului
        console.log('Recording upvote in database');
        await client.query(
          'INSERT INTO comment_votes (user_id, comment_id, vote_type) VALUES ($1, $2, 1)',
          [dbUserId, commentId]
        );
        
        // Incrementăm numărul de voturi
        console.log('Incrementing vote count');
        const result = await client.query(
          'UPDATE comments SET votes = votes + 1 WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query('COMMIT');
        console.log('Vote added successfully, new count:', result.rows[0].votes);
        res.json(result.rows[0]);
      } else {
        // Utilizatorul vrea să elimine un vot
        if (!hasExistingVote) {
          // Utilizatorul nu a votat încă, returnăm starea curentă
          console.log('User has not voted yet, returning current state');
          await client.query('COMMIT');
          return res.json(currentComment);
        }
        
        // Ștergem votul
        console.log('Removing vote from database');
        await client.query(
          'DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
          [dbUserId, commentId]
        );
        
        // Decrementăm numărul de voturi, păstrându-l >= 0
        console.log('Decrementing vote count');
        const result = await client.query(
          'UPDATE comments SET votes = GREATEST(0, votes - 1) WHERE id = $1 RETURNING *',
          [commentId]
        );
        
        await client.query('COMMIT');
        console.log('Vote removed successfully, new count:', result.rows[0].votes);
        res.json(result.rows[0]);
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error in vote operation:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing comment vote:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: 'A apărut o eroare la procesarea votului. Vă rugăm să încercați din nou.'
    });
  }
});

// "Delete" a comment (mark as deleted)
router.delete('/:memeId/comments/:commentId', async (req, res) => {
  try {
    const { memeId, commentId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Trebuie să fiți autentificat pentru a șterge comentarii.'
      });
    }
    
    // Verificăm dacă utilizatorul este dezactivat
    const userStatusCheck = await pool.query(
      'SELECT is_deleted FROM users WHERE google_id = $1',
      [userId]
    );
    
    if (userStatusCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userStatusCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        message: 'Contul dvs. a fost dezactivat și nu poate efectua această acțiune.'
      });
    }
    
    // Verificăm dacă comentariul există
    const commentCheck = await pool.query(
      'SELECT c.*, u.google_id as comment_owner_id FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1 AND c.meme_id = $2',
      [commentId, memeId]
    );
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Comment not found',
        message: 'Comentariul căutat nu există.'
      });
    }
    
    const comment = commentCheck.rows[0];
    
    // Verificăm dacă comentariul este deja șters
    if (comment.is_deleted) {
      return res.status(400).json({
        error: 'Comment already deleted',
        message: 'Acest comentariu a fost deja șters.'
      });
    }
    
    // Obținem informații despre utilizator și rolurile sale
    const userCheck = await pool.query(`
      SELECT u.id, u.google_id, u.username, r.name as role 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.google_id = $1
    `, [userId]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    const isAdmin = user.role === 'admin';
    const isModerator = user.role === 'moderator';
    const isCommentOwner = comment.comment_owner_id === userId;
    console.log('Delete comment permission check:', {
      commentId,
      userId,
      comment_owner_id: comment.comment_owner_id,
      isAdmin,
      isModerator,
      isCommentOwner
    });
    
    // Verificăm permisiunile de ștergere
    if (!isAdmin && !isModerator && !isCommentOwner) {
      return res.status(403).json({
        error: 'Permission denied',
        message: 'Nu aveți permisiunea de a șterge acest comentariu.'
      });
    }
    
    // Determinăm mesajul potrivit în funcție de cine șterge comentariul
    let deletionMessage;
    if (isAdmin) {
      deletionMessage = '[Admin: Am șters asta ca să-mi justific salariul]';
    } else if (isModerator) {
      deletionMessage = '[Moderator: Am șters asta în pauza de cafea, înainte să mă întorc la Excel]';
    } else {
      deletionMessage = '[Imi retrag comentariul, m-am razgandit]';
    }
    // Marcăm comentariul ca șters și îi golim conținutul
    const result = await pool.query(
      'UPDATE comments SET content = $1, is_deleted = TRUE WHERE id = $2 RETURNING *',
      [deletionMessage, commentId]
    );
    
    res.json({ 
      success: true, 
      message: 'Comentariul a fost șters cu succes.',
      comment: result.rows[0]
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