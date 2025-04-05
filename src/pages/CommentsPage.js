import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { memeApi, commentApi } from '../api/api';
import './styles/CommentsPage.css';
import { FaArrowUp, FaComment } from 'react-icons/fa';

const CommentsPage = () => {
  const { id } = useParams();
  const { currentUser, hasUpvoted, addUpvotedMeme } = useContext(AuthContext);
  
  const [meme, setMeme] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch meme and its comments
  useEffect(() => {
    const fetchMemeData = async () => {
      try {
        setLoading(true);
        const memeData = await memeApi.getMemeById(id);
        setMeme(memeData);
        
        // Fetch comments after getting meme
        const commentsData = await commentApi.getComments(id);
        setComments(commentsData);
        
        setError(null);
      } catch (error) {
        console.error('Error loading meme data:', error);
        setError('Failed to load the meme. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemeData();
  }, [id]);

  // Handle voting
  const handleVote = async () => {
    if (!currentUser) {
      alert('Please log in to upvote memes');
      return;
    }

    if (hasUpvoted(meme.id)) {
      alert('You have already voted on this meme');
      return;
    }

    try {
      const updatedMeme = await memeApi.upvoteMeme(meme.id);
      setMeme(updatedMeme);
      addUpvotedMeme(meme.id);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to register vote. Please try again.');
    }
  };

  // Submit new comment
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      alert('Comment cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const commentData = {
        userId: currentUser.uid,
        username: currentUser.username || currentUser.displayName || 'Anonymous',
        content: newComment
      };
      
      const newCommentData = await commentApi.addComment(meme.id, commentData);
      
      // Add the new comment to the list
      setComments([newCommentData, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      if (diffHours < 1) {
        const diffMinutes = Math.round((now - date) / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  // Get proper image URL
  const getImageUrl = () => {
    if (!meme) return '';
    
    const imageUrl = meme.imageUrl || meme.image_url;
    
    // Handle server-relative URLs (those starting with /uploads/)
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      // Get base URL from environment or use default
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337';
      return `${apiBaseUrl}${imageUrl}`;
    }
    
    // Return as is for absolute URLs or empty string if none exists
    return imageUrl || '';
  };

  if (loading) {
    return (
      <div className="comments-page loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comments-page error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/browse" className="back-link">Back to Browse</Link>
      </div>
    );
  }

  if (!meme) {
    return (
      <div className="comments-page error">
        <h2>Meme Not Found</h2>
        <p>The meme you're looking for doesn't exist.</p>
        <Link to="/browse" className="back-link">Back to Browse</Link>
      </div>
    );
  }

  return (
    <div className="comments-page">
      <div className="meme-detail">
        <div className="meme-header">
          <h1 className="meme-title">{meme.title || `${meme.company}'s Meme`}</h1>
          <div className="meme-metadata">
            <span className="meme-author">
              Posted by {meme.username || meme.user?.username || (meme.user_id ? 'unknown user' : 'anonymous')}
            </span>
            <span className="meme-date">{formatDate(meme.createdAt || meme.created_at)}</span>
            {meme.country && <span className="meme-country">{meme.country}</span>}
          </div>
        </div>
        
        <div className="meme-content">
          <div className="votes-sidebar">
            <button 
              className={`vote-button ${hasUpvoted(meme.id) ? 'voted' : ''} ${!currentUser ? 'disabled' : ''}`} 
              onClick={handleVote}
              disabled={hasUpvoted(meme.id) || !currentUser}
              title={!currentUser ? 'Log in to upvote' : hasUpvoted(meme.id) ? 'Already upvoted' : 'Upvote'}
            >
              <FaArrowUp className="icon" />
            </button>
            <span className="vote-count">{meme.votes || 0}</span>
          </div>
          
          <div className="meme-image-container">
            <img 
              src={getImageUrl()} 
              alt={`Meme from ${meme.company}`} 
              className="meme-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-meme.jpg';
              }}
            />
            {meme.message && (
              <div className="meme-message">
                {meme.message}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="comments-section">
        <h2 className="comments-header">
          <FaComment className="icon" />
          <span>Comments ({comments.length})</span>
        </h2>
        
        {currentUser ? (
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="submit-comment" 
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            Please <Link to="/login">log in</Link> to add comments
          </div>
        )}
        
        {comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">{comment.username || (comment.user_id ? 'unknown user' : 'Anonymous')}</span>
                  <span className="comment-date">{formatDate(comment.created_at)}</span>
                </div>
                <div className="comment-text">{comment.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-comments">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
      
      <div className="navigation-links">
        <Link to="/browse" className="back-link">Back to Browse</Link>
        <Link to={`/company/${meme.company}`} className="company-link">
          More from {meme.company}
        </Link>
      </div>
    </div>
  );
};

export default CommentsPage; 