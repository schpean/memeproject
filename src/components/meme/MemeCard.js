import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../contexts/AuthContext';
import { memeApi, commentApi } from '../../api/api';
import { API_BASE_URL } from '../../utils/config';
import { notify } from '../common/Notification';
import { formatCount } from '../../utils/format';
import './styles/MemeCard.css';
import { FaComment, FaArrowUp, FaShare, FaHourglassHalf, FaCheck, FaTimes, FaEllipsisH } from 'react-icons/fa';

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

  // Handle share button click
  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create the shareable link
    const shareUrl = `${window.location.origin}/meme/${meme.id}`;
    
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

  // Get proper image URL
  const getImageUrl = () => {
    const imageUrl = meme.imageUrl || meme.image_url;
    
    // Handle server-relative URLs (those starting with /uploads/)
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    
    // Handle absolute URLs - ensure they're preserved as-is
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return imageUrl;
    }
    
    // For completely broken image paths, use a placeholder
    return imageUrl || '/placeholder-meme.jpg';
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
          <button 
            className="share-button" 
            onClick={handleShare}
            title="Share this meme"
          >
            <FaShare className="icon" />
            <span>Share</span>
          </button>
          
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