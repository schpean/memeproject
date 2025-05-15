import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import { memeApi, commentApi } from '../../api/api';
import { API_BASE_URL } from '../../utils/config';
import { notify } from '../common/Notification';
import ShareDropdown from './ShareDropdown';
import { formatCount } from '../../utils/format';
import './styles/MemeCard.css';
import './styles/ShareDropdown.css';
import { FaComment, FaArrowUp, FaHourglassHalf, FaCheck, FaTimes, FaEllipsisH } from 'react-icons/fa';

const MemeCard = ({ meme, onVote = () => {}, compact = false, showApprovalStatus = false }) => {
  const { currentUser, hasUpvoted, addUpvotedMeme, removeUpvotedMeme, isAdmin, isModerator } = useContext(AuthContext);
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
      const updatedMeme = await memeApi.upvoteMeme(meme.id, isUpvoted);
      
      // Call parent handler with updated meme
      onVote(updatedMeme);
      
      // Track this upvote in AuthContext or remove it if un-upvoting
      if (isUpvoted) {
        removeUpvotedMeme(meme.id);
      } else {
        addUpvotedMeme(meme.id);
      }
    } catch (error) {
      console.error('Error voting on meme:', error);
      
      // Check for specific error messages and handle gracefully
      if (error.response) {
        if (error.response.status === 401) {
          alert('Please log in to upvote memes');
        } else if (error.response.status === 404) {
          alert('This meme cannot be found');
        } else if (hasUpvoted(meme.id)) {
          // Silently handle unvote errors as they may be due to sync issues
          console.log('Unvote error handled silently');
        } else {
          // Only show alert for upvote errors
          alert('Unable to upvote. Please try again later.');
        }
      } else {
        // Only show alerts for network errors when trying to upvote
        if (!hasUpvoted(meme.id)) {
          alert('Network error. Please check your connection and try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle meme approval
  const handleApprove = async (e, status) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser || (!isAdmin && !isModerator)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Call API to approve or reject the meme
      const response = await fetch(`${API_BASE_URL}/memes/${meme.id}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.uid
        },
        body: JSON.stringify({ 
          status, 
          reason: status === 'rejected' ? prompt('Please provide a reason for rejection:') : null 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${status} meme`);
      }
      
      const updatedMeme = await response.json();
      
      // Update the meme in the parent component
      onVote(updatedMeme);
      
      notify(`Meme ${status === 'approved' ? 'approved' : 'rejected'} successfully`, 'success');
    } catch (error) {
      console.error(`Error ${status} meme:`, error);
      notify(`Failed to ${status} meme. Please try again.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get proper image URL
  const getImageUrl = () => {
    const imageUrl = meme.imageUrl || meme.image_url;
    
    // Dacă nu există URL de imagine, returnăm placeholder
    if (!imageUrl) {
      return '/placeholder-meme.jpg';
    }
    
    // Construim URL-ul complet pentru imagine
    let fullImageUrl;
    
    // Handle server-relative URLs (those starting with /uploads/)
    if (imageUrl.startsWith('/uploads/')) {
      // Determine base URL based on environment
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : `${window.location.origin}`;
      
      // Asigură-te că URL-ul rezultat este complet
      fullImageUrl = `${baseUrl}${imageUrl}`;
    }
    // Handle absolute URLs with HTTP - convert to HTTPS
    else if (imageUrl.startsWith('http://')) {
      fullImageUrl = imageUrl.replace('http://', 'https://');
    }
    // Handle absolute URLs with HTTPS - keep as is
    else if (imageUrl.startsWith('https://')) {
      fullImageUrl = imageUrl;
    }
    // Handle other relative URLs
    else {
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : window.location.origin;
      
      const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      fullImageUrl = `${baseUrl}${imagePath}`;
    }
    
    return fullImageUrl;
  };

  // Get meme title or fallback
  const getMemeTitle = () => {
    return meme.title || `${meme.company}'s review meme`;
  };

  // Truncate message for compact view
  const getTruncatedMessage = () => {
    if (!meme.message) return null;
    
    const maxLength = 60; // Maximum characters to show in compact view
    
    if (compact && meme.message.length > maxLength) {
      return meme.message.substring(0, maxLength) + '...';
    }
    
    return meme.message;
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

  // Get approval status indicator
  const getApprovalStatus = () => {
    const status = meme.approval_status || 'pending';
    
    switch (status) {
      case 'approved':
        return <span className="approval-status approved">
          <FaCheck /> Approved {meme.approved_by_username ? `by ${meme.approved_by_username}` : ''}
        </span>;
      case 'rejected':
        return <span className="approval-status rejected">
          <FaTimes /> Rejected {meme.approved_by_username ? `by ${meme.approved_by_username}` : ''} 
          {meme.rejection_reason ? `: ${meme.rejection_reason}` : ''}
        </span>;
      case 'pending':
      default:
        return <span className="approval-status pending"><FaHourglassHalf /> Pending</span>;
    }
  };

  // Generăm URL-ul absolut pentru partajare
  const getShareUrl = () => {
    const relativePath = `/meme/${meme.id}`;
    const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
      ? 'https://bossme.me'
      : window.location.origin;
    return `${baseUrl}${relativePath}`;
  };
  
  // URL-ul pentru share
  const shareUrl = getShareUrl();
  
  // Imagine pentru partajare
  const shareImageUrl = getImageUrl();
  
  // Debug pentru a vedea url-ul
  console.log('MemeCard share URL:', shareUrl);
  console.log('MemeCard image URL:', shareImageUrl);

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
            {showApprovalStatus && getApprovalStatus()}
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
            {getTruncatedMessage()}
            {compact && meme.message.length > 60 && (
              <span className="message-truncated">
                <FaEllipsisH />
              </span>
            )}
          </div>
        )}
      </Link>
      
      <div className="meme-actions">
        <div className="meme-actions-left">
          <button 
            className={`vote-button ${hasUpvoted(meme.id) ? 'voted' : ''} ${!currentUser ? 'disabled' : ''}`} 
            onClick={handleVote}
            disabled={loading || !currentUser}
            title={!currentUser ? 'Log in to upvote' : hasUpvoted(meme.id) ? 'Click to remove upvote' : 'Upvote'}
          >
            <FaArrowUp className="icon" />
            <span className="vote-count">{formatCount(meme.votes || 0)}</span>
          </button>
        </div>
        
        <div className="meme-actions-center">
          <Link to={`/meme/${meme.id}`} className="comment-button">
            <FaComment className="icon" />
            <span>Comments{!fetchError && commentCount > 0 ? ` (${commentCount})` : ''}</span>
          </Link>
        </div>
        
        <div className="meme-actions-right">
          <ShareDropdown 
            url={shareUrl}
            title={getMemeTitle()}
            message={meme.message || ''}
            imageUrl={shareImageUrl}
          />
          
          {showApprovalStatus && (isAdmin || isModerator) && meme.approval_status === 'pending' && (
            <>
              <button 
                className="approve-button" 
                onClick={(e) => handleApprove(e, 'approved')}
                disabled={loading}
                title="Approve this meme"
              >
                <FaCheck className="icon" />
                <span>Approve</span>
              </button>
              
              <button 
                className="reject-button" 
                onClick={(e) => handleApprove(e, 'rejected')}
                disabled={loading}
                title="Reject this meme"
              >
                <FaTimes className="icon" />
                <span>Reject</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemeCard;