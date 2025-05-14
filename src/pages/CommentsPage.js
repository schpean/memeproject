import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { memeApi, commentApi } from '../api/api';
import CommentSection from '../components/comments/CommentSection';
import { notify } from '../components/common/Notification';
import ShareDropdown from '../components/common/ShareDropdown';
import { formatCount } from '../utils/format';
import './styles/CommentsPage.css';
import { FaArrowUp, FaArrowLeft } from 'react-icons/fa';

// Accept optional memeId prop, but still use params if not provided
const CommentsPage = ({ memeId: propMemeId }) => {
  // Use the prop if provided, otherwise use the URL parameter
  const { id: paramId } = useParams();
  const id = propMemeId || paramId;
  
  const { currentUser, hasUpvoted, addUpvotedMeme, removeUpvotedMeme } = useContext(AuthContext);
  
  const [meme, setMeme] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch meme and its comments
  useEffect(() => {
    let isMounted = true;
    const fetchMemeData = async () => {
      try {
        setLoading(true);
        const memeData = await memeApi.getMemeById(id);
        
        // Prevent state updates if component unmounted
        if (!isMounted) return;
        setMeme(memeData);
        
        // Fetch comments after getting meme
        const commentsData = await commentApi.getComments(id);
        if (!isMounted) return;
        setComments(commentsData);
        
        setError(null);
      } catch (error) {
        console.error('Error loading meme data:', error);
        if (isMounted) {
          setError('Failed to load the meme. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMemeData();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle voting
  const handleVote = async () => {
    if (!currentUser) {
      alert('Please log in to upvote memes');
      return;
    }

    if (!meme || !meme.id) {
      console.error('Cannot vote: meme data is not available');
      return;
    }

    try {
      const isUpvoted = hasUpvoted(meme.id);
      const updatedMeme = await memeApi.upvoteMeme(meme.id, isUpvoted);
      setMeme(updatedMeme);
      
      // Update local state to reflect vote
      if (isUpvoted) {
        removeUpvotedMeme(meme.id);
      } else {
        addUpvotedMeme(meme.id);
      }
    } catch (error) {
      console.error('Error voting:', error);
      
      // Handle errors gracefully
      if (error.response) {
        if (error.response.status === 401) {
          alert('Please log in to upvote memes');
        } else if (error.response.status === 404) {
          alert('This meme cannot be found');
        } else if (!hasUpvoted(meme.id)) {
          // Only show alerts for upvote errors
          alert('Unable to upvote. Please try again later.');
        }
      } else if (!hasUpvoted(meme.id)) {
        // Only show alerts for network errors when trying to upvote
        alert('Network error. Please check your connection and try again.');
      }
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
      const apiBaseUrl = process.env.NODE_ENV === 'production'
        ? (process.env.REACT_APP_API_BASE_URL || 'https://bossme.me')
        : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337');
      return `${apiBaseUrl}${imageUrl}`;
    }
    
    // Handle absolute URLs - ensure they're preserved as-is
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return imageUrl;
    }
    
    // For completely broken image paths, use a placeholder
    return imageUrl || '/placeholder-meme.jpg';
  };

  // Get meme title
  const getMemeTitle = () => {
    if (!meme) return '';
    return meme.title || `${meme.company}'s review meme`;
  };

  const renderVoteButton = () => (
    <button 
      className={`vote-button ${hasUpvoted(meme?.id) ? 'voted' : ''}`} 
      onClick={handleVote}
      disabled={!currentUser}
      title={!currentUser ? 'Log in to upvote' : hasUpvoted(meme?.id) ? 'Click to remove upvote' : 'Upvote'}
    >
      <FaArrowUp className="icon" />
      <span className="vote-count">{formatCount(meme?.votes || 0)}</span>
    </button>
  );

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

  // Componenta actuală de share URL pentru a fi folosită cu ShareDropdown
  const shareUrl = `${window.location.origin}/meme/${meme.id}`;

  return (
    <div className="comments-page">
      <div className="meme-detail">
        <div className="meme-header">
          <div className="votes-sidebar">
            {renderVoteButton()}
          </div>
          
          <div className="meme-info">
            <h1 className="meme-title">{getMemeTitle()}</h1>
            <div className="meme-metadata">
              <span className="meme-author">
                Posted by {meme.username || meme.user?.username || (meme.user_id ? 'unknown user' : 'anonymous')}
              </span>
              <span className="meme-date">{formatDate(meme.createdAt || meme.created_at)}</span>
              {meme.city && <span className="meme-city">{meme.city}</span>}
            </div>
          </div>
        </div>
        
        <div className="meme-content">
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
        
        <div className="meme-actions">
          <div className="meme-actions-left">
            {renderVoteButton()}
          </div>
          
          <div className="meme-actions-center">
            {/* Center content - could be a comment count */}
          </div>
          
          <div className="meme-actions-right">
            <ShareDropdown 
              url={shareUrl}
              title={getMemeTitle()}
              message={meme.message}
            />
          </div>
        </div>
      </div>
      
      {/* Pass the correct meme ID to the comment section */}
      <CommentSection memeId={meme.id} initialComments={comments} />
      
      <div className="navigation-links">
        <Link to="/browse" className="back-link">
          <FaArrowLeft className="back-icon" />
          <span>Browse</span>
        </Link>
      </div>
    </div>
  );
};

export default CommentsPage; 