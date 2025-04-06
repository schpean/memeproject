import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { memeApi, commentApi } from '../api/api';
import CommentSection from '../components/comments/CommentSection';
import { notify } from '../components/common/Notification';
import { getAvatarUrl } from '../utils/avatarUtils';
import './styles/CommentsPage.css';
import { FaArrowUp, FaShare } from 'react-icons/fa';

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

    try {
      const isUpvoted = hasUpvoted(meme.id);
      
      // Don't show alert when already voted, just handle silently
      if (isUpvoted) {
        console.log('User has already upvoted this meme, attempting to remove vote');
      }
      
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
        } else if (hasUpvoted(meme.id)) {
          // Silently handle unvote errors
          console.log('Unvote error handled silently');
        } else {
          // Only show alerts for upvote errors
          alert('Unable to upvote. Please try again later.');
        }
      } else {
        // Only show alerts for network errors when trying to upvote
        if (!hasUpvoted(meme.id)) {
          alert('Network error. Please check your connection and try again.');
        }
      }
    }
  };

  // Handle share function
  const handleShare = () => {
    // Create the shareable link (current URL)
    const shareUrl = window.location.href;
    
    // Function to notify user that the link is ready to be copied
    const showShareNotification = () => {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      notify(`Share this link: ${shareUrl}`, 'info');
      
      textArea.focus();
      textArea.select();
      
      try {
        // Use document.execCommand as fallback
        const successful = document.execCommand('copy');
        if (successful) {
          notify('Link copied to clipboard!', 'success');
        } else {
          // Only show alert if execCommand fails
          alert(`Copy this link to share: ${shareUrl}`);
          notify('Please copy the link manually', 'info');
        }
      } catch (err) {
        console.error('Fallback clipboard copy failed:', err);
        // Only show alert if execCommand throws an error
        alert(`Copy this link to share: ${shareUrl}`);
      }
      
      document.body.removeChild(textArea);
    };
    
    // Try the Clipboard API first (modern browsers in secure context)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          notify('Link copied to clipboard!', 'success');
        })
        .catch(err => {
          console.error('Clipboard API failed:', err);
          // Fall back to the manual method
          showShareNotification();
        });
    } else {
      // Fallback for browsers without Clipboard API support
      console.log('Clipboard API not available, using fallback');
      showShareNotification();
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
    
    // Handle absolute URLs - ensure they're preserved as-is
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return imageUrl;
    }
    
    // For completely broken image paths, use a placeholder
    return imageUrl || '/placeholder-meme.jpg';
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
          
          <div className="meme-info">
            <h1 className="meme-title">{meme.title || `${meme.company}'s review meme`}</h1>
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
          <button 
            className="share-button" 
            onClick={handleShare}
            title="Share this meme"
          >
            <FaShare className="icon" />
            <span>Share</span>
          </button>
        </div>
      </div>
      
      {/* Pass the correct meme ID to the comment section */}
      <CommentSection memeId={meme.id} initialComments={comments} />
      
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