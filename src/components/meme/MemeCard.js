import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import { memeApi, commentApi } from '../../api/api';
import './styles/MemeCard.css';
import { FaComment, FaArrowUp } from 'react-icons/fa';

const MemeCard = ({ meme, onVote = () => {}, compact = false }) => {
  const { currentUser, hasUpvoted, addUpvotedMeme, removeUpvotedMeme } = useContext(AuthContext);
  const [commentCount, setCommentCount] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch comment count on initial render
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const comments = await commentApi.getComments(meme.id);
        setCommentCount(comments.length);
        setFetchError(false);
      } catch (error) {
        // Silently handle error without console logging
        setFetchError(true);
      }
    };

    fetchCommentCount();
  }, [meme.id]);

  // Function to handle upvoting
  const handleVote = async (e) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent event bubbling
    
    if (!currentUser) {
      alert('Please log in to upvote memes');
      return;
    }

    setLoading(true);
    
    try {
      const isUpvoted = hasUpvoted(meme.id);
      const updatedMeme = await memeApi.upvoteMeme(meme.id);
      
      // Call parent handler with updated meme
      onVote(updatedMeme);
      
      // Track this upvote in AuthContext or remove it if un-upvoting
      if (isUpvoted) {
        addUpvotedMeme(meme.id);
      } else {
        removeUpvotedMeme(meme.id);
      }
    } catch (error) {
      // Silently handle error
      alert('Failed to register vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get proper image URL
  const getImageUrl = () => {
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

  // Get meme title or fallback
  const getMemeTitle = () => {
    return meme.title || `${meme.company}'s Meme`;
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

  return (
    <div className={`meme-card ${compact ? 'compact' : ''}`}>
      <div className="meme-header">
        <div className="meme-info">
          <h3 className="meme-title">{getMemeTitle()}</h3>
          <div className="meme-metadata">
            <span className="meme-author">
              Posted by {meme.username || meme.user?.username || (meme.user_id ? 'unknown user' : 'anonymous')}
            </span>
            <span className="meme-date">{formatDate(meme.createdAt || meme.created_at)}</span>
            {meme.city && <span className="meme-city">{meme.city}</span>}
          </div>
        </div>
      </div>
      
      <Link to={`/meme/${meme.id}`} className="meme-image-container">
        <img 
          src={getImageUrl()} 
          alt={getMemeTitle()} 
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
      </Link>
      
      <div className="meme-actions">
        <button 
          className={`vote-button ${hasUpvoted(meme.id) ? 'voted' : ''} ${!currentUser ? 'disabled' : ''}`} 
          onClick={handleVote}
          disabled={loading || !currentUser}
          title={!currentUser ? 'Log in to upvote' : hasUpvoted(meme.id) ? 'Click to remove upvote' : 'Upvote'}
        >
          <FaArrowUp className="icon" />
          <span className="vote-count">{meme.votes || 0}</span>
        </button>
        
        <Link to={`/meme/${meme.id}`} className="comment-button">
          <FaComment className="icon" />
          <span>Comments{!fetchError && commentCount > 0 ? ` (${commentCount})` : ''}</span>
        </Link>
      </div>
    </div>
  );
};

export default MemeCard;