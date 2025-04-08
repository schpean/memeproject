import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaReply, FaUser, FaFire } from 'react-icons/fa';
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

const Comment = ({ comment, onReply, currentUser, onVoteComment }) => {
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
      setHasUserUpvoted(upvotedComments.includes(comment.id));
    }
  }, [currentUser, comment.id]);

  // Update vote count when comment prop changes
  useEffect(() => {
    setVoteCount(comment.votes || 0);
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

    setIsVoting(true);
    
    try {
      // Call the parent handler to update the vote in the database
      if (onVoteComment) {
        const updatedComment = await onVoteComment(comment.id, hasUserUpvoted);
        if (updatedComment) {
          setVoteCount(updatedComment.votes || voteCount + (hasUserUpvoted ? -1 : 1));
          
          // Toggle upvote status in localStorage
          const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
          
          if (hasUserUpvoted) {
            // Remove from upvoted comments
            const newUpvotedComments = upvotedComments.filter(id => id !== comment.id);
            localStorage.setItem('upvotedComments', JSON.stringify(newUpvotedComments));
            setHasUserUpvoted(false);
          } else {
            // Add to upvoted comments
            upvotedComments.push(comment.id);
            localStorage.setItem('upvotedComments', JSON.stringify(upvotedComments));
            setHasUserUpvoted(true);
          }
        }
      } else {
        // Fallback for demo if no handler is provided
        setVoteCount(voteCount + (hasUserUpvoted ? -1 : 1));
        setHasUserUpvoted(!hasUserUpvoted);
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
      
      // Only show alert if not already voted
      if (!hasUserUpvoted) {
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

  return (
    <div className={`reddit-comment ${isCollapsed ? 'collapsed' : ''}`}>
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
              <button 
                className="reply-button" 
                onClick={() => setIsReplying(!isReplying)}
                disabled={!currentUser}
              >
                <FaReply /> Reply
              </button>
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
                    currentUser={currentUser}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
        
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