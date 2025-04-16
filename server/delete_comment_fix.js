// Modificări pentru a repara endpoint-ul de ștergere a comentariilor

// 1. Modificarea interogării SQL pentru a obține google_id-ul utilizatorului care a postat comentariul
// Linia originală:
// const commentCheck = await pool.query('SELECT * FROM comments WHERE id = $1 AND meme_id = $2', [commentId, memeId]);

// Înlocuiește cu:
const commentCheck = await pool.query(
  'SELECT c.*, u.google_id as comment_owner_id FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1 AND c.meme_id = $2',
  [commentId, memeId]
);

// 2. Modificarea verificării proprietarului comentariului
// Linia originală:
// const isCommentOwner = comment.user_id === user.id;

// Înlocuiește cu:
const isCommentOwner = comment.comment_owner_id === userId;

// 3. Adăugă logging pentru debug
console.log('Delete comment permission check:', {
  commentId,
  userId,
  comment_owner_id: comment.comment_owner_id,
  isAdmin,
  isModerator,
  isCommentOwner
}); 