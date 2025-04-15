import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaReply, FaUser, FaFire, FaTrash } from 'react-icons/fa';
import './styles/Comment.css';
import { getDicebearAvatarUrl } from '../../utils/avatarUtils';
import { formatCount } from '../../utils/format';

// Function to format dates like "4h ago", "3h ago", etc.
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Unknown date';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.round((now - date) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMinutes = Math.round((now - date) / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

const Comment = ({ comment, onReply, currentUser, onVoteComment, onDeleteComment, isAdmin, isModerator }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [hasUserUpvoted, setHasUserUpvoted] = useState(false);
  const [voteCount, setVoteCount] = useState(comment.votes || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Get avatar URL - use Dicebear as default or fallback
  const getAvatarUrl = () => {
    // If there's a valid user avatar and no error, use it
    if (comment.userAvatar && !avatarError && 
       (comment.userAvatar.startsWith('http://') || 
        comment.userAvatar.startsWith('https://'))) {
      return comment.userAvatar;
    }
    
    // Otherwise generate a Dicebear avatar for this user
    return getDicebearAvatarUrl(comment.username || 'anonymous');
  };

  // Handle image loading errors
  const handleImageError = () => {
    setAvatarError(true);
  };

  // Check if user has already upvoted this comment
  useEffect(() => {
    if (currentUser) {
      // Get upvoted comments from localStorage
      const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
      console.log('Comment useEffect - comment ID:', comment.id);
      console.log('Comment useEffect - upvotedComments from localStorage:', upvotedComments);
      
      // Convertim la string pentru a asigura o comparație corectă
      const commentIdStr = String(comment.id);
      const hasUpvoted = upvotedComments.some(id => String(id) === commentIdStr);
      
      console.log('Comment useEffect - is upvoted?', hasUpvoted);
      setHasUserUpvoted(hasUpvoted);
    }
  }, [currentUser, comment.id]);

  // Update vote count when comment prop changes
  useEffect(() => {
    // Asigură-te că numărul de voturi nu este negativ
    const safeVoteCount = Math.max(0, comment.votes || 0);
    setVoteCount(safeVoteCount);
  }, [comment.votes]);

  // Toggle collapse state of the comment
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle upvote click
  const handleUpvote = async () => {
    if (!currentUser) {
      alert('Please log in to upvote comments');
      return;
    }

    console.log('Handling upvote for comment:', comment.id);
    
    // Prevenim dublu clic în timpul procesării
    if (isVoting) {
      console.log('Ignoring click - vote operation already in progress');
      return;
    }
    
    setIsVoting(true);
    
    try {
      if (onVoteComment) {
        // Actualizăm votul - dacă hasUserUpvoted este true, eliminăm votul, altfel adăugăm un vot
        const updatedComment = await onVoteComment(comment.id, hasUserUpvoted);
        
        if (updatedComment) {
          // Actualizăm numărul de voturi în UI
          setVoteCount(Math.max(0, updatedComment.votes || 0));
          
          // Actualizăm localStorage și starea locală
          const commentIdStr = String(comment.id);
          const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
          
          if (hasUserUpvoted) {
            // Eliminăm comentariul din localStorage dacă l-am votat anterior
            const newUpvotedComments = upvotedComments.filter(id => String(id) !== commentIdStr);
            localStorage.setItem('upvotedComments', JSON.stringify(newUpvotedComments));
            setHasUserUpvoted(false);
            console.log('Removed vote - new count:', updatedComment.votes);
          } else {
            // Adăugăm comentariul în localStorage dacă nu l-am votat anterior
            if (!upvotedComments.some(id => String(id) === commentIdStr)) {
              upvotedComments.push(comment.id);
              localStorage.setItem('upvotedComments', JSON.stringify(upvotedComments));
            }
            setHasUserUpvoted(true);
            console.log('Added vote - new count:', updatedComment.votes);
          }
        }
      } else {
        console.log('Warning: onVoteComment handler is not provided');
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
      
      // Afișăm un mesaj de eroare
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to vote on comment. Please try again.');
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Handle reply submission
  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    
    if (onReply) {
      onReply(comment.id, replyContent);
    }
    
    setReplyContent('');
    setIsReplying(false);
  };

  // Determine if this comment has replies
  const hasReplies = comment.replies && comment.replies.length > 0;

  // Verifică dacă comentariul a fost șters
  const isDeleted = comment.is_deleted || comment.content === '[Comentariu șters]';
  
  // Verifică dacă utilizatorul poate șterge comentariul
  const canDeleteComment = currentUser && !isDeleted && (
    isAdmin || 
    isModerator || 
    (currentUser.uid && comment.owner_id && currentUser.uid === comment.owner_id)
  );
  
  // Debug info
  useEffect(() => {
    console.log('Comment ID:', comment.id);
    console.log('Comment data:', comment);
    console.log('Current user:', currentUser);
    console.log('Check IDs:', {
      commentOwnerId: comment.owner_id,
      currentUserUid: currentUser?.uid,
      match: currentUser?.uid === comment.owner_id
    });
    console.log('Permissions:', {
      isAdmin,
      isModerator,
      canDeleteComment
    });
  }, [comment, currentUser, isAdmin, isModerator, canDeleteComment]);
  
  // Handler pentru ștergerea comentariului
  const handleDeleteComment = async () => {
    if (!canDeleteComment) return;
    
    if (window.confirm('Ești sigur că vrei să ștergi acest comentariu?')) {
      try {
        await onDeleteComment(comment.id);
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Nu s-a putut șterge comentariul. Încercați din nou.');
      }
    }
  };

  return (
    <div className={`reddit-comment ${isCollapsed ? 'collapsed' : ''} ${isDeleted ? 'deleted-comment' : ''}`}>
      <button 
        className={`comment-vote ${hasUserUpvoted ? 'voted' : ''} ${voteCount >= 50 ? 'hot' : ''}`}
        onClick={handleUpvote}
        disabled={!currentUser || isVoting}
        aria-label={hasUserUpvoted ? "Remove upvote" : "Upvote"}
        title={hasUserUpvoted ? "Click to remove upvote" : "Upvote"}
      >
        {voteCount >= 50 ? <FaFire className="upvote-icon" /> : <FaArrowUp className="upvote-icon" />}
        <span className="vote-count">{formatCount(voteCount)}</span>
      </button>
      
      <div className="comment-content">
        <div className="comment-header">
          <div className="comment-avatar">
            <img 
              src={getAvatarUrl()}
              alt={comment.username || 'Anonymous'}
              className="avatar-image"
              onError={handleImageError}
            />
          </div>
          <span className="comment-author">{comment.username || 'Anonymous'}</span>
          <span className="comment-dot">•</span>
          <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
        </div>
        
        {!isCollapsed ? (
          <>
            <div className="comment-text">{comment.content}</div>
            
            <div className="comment-actions">
              {!isDeleted && (
                <button 
                  className="reply-button" 
                  onClick={() => setIsReplying(!isReplying)}
                  disabled={!currentUser}
                >
                  <FaReply /> Reply
                </button>
              )}
            </div>
            
            {isReplying && (
              <form className="reply-form" onSubmit={handleReplySubmit}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="What are your thoughts?"
                  rows="3"
                />
                <div className="reply-actions">
                  <button type="button" onClick={() => setIsReplying(false)}>Cancel</button>
                  <button 
                    type="submit" 
                    disabled={!replyContent.trim()}
                    className="submit-reply"
                  >
                    Reply
                  </button>
                </div>
              </form>
            )}
            
            {/* Render child comments if any */}
            {hasReplies && (
              <div className="comment-replies">
                {comment.replies.map(reply => (
                  <Comment 
                    key={reply.id} 
                    comment={reply} 
                    onReply={onReply}
                    onVoteComment={onVoteComment}
                    onDeleteComment={onDeleteComment}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    isModerator={isModerator}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
        
        {/* Delete button - visible only for users with permission */}
        {canDeleteComment && (
          <button 
            className="delete-comment-button" 
            onClick={handleDeleteComment}
            title="Șterge comentariul"
          >
            <FaTrash /> Șterge
          </button>
        )}
        
        {/* Collapse button that looks like the screenshot */}
        <button 
          className="collapse-toggle-button" 
          onClick={toggleCollapse}
        >
          {isCollapsed ? "Collapse" : "− Collapse"}
        </button>
      </div>
    </div>
  );
};

export default Comment; 