import React, { useState, useEffect, useRef } from 'react';
import { FaArrowUp, FaReply, FaUser, FaFire, FaTrash } from 'react-icons/fa';
import './styles/Comment.css';
import './styles/CommentMobile.css';
import { getDicebearAvatarUrl } from '../../utils/avatarUtils';
import { formatCount } from '../../utils/format';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../ConfirmDialog';

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

// Injectăm un stil global pentru a forța suprascrierea pentru mobile
// Aceasta este o tehnică ultimă soluție pentru a garanta aplicarea stilurilor
const injectMobileStyles = () => {
  // Verifică dacă stilul a fost deja injectat
  if (document.getElementById('force-mobile-comment-styles')) return;
  
  // Creează elementul de stil
  const styleElement = document.createElement('style');
  styleElement.id = 'force-mobile-comment-styles';
  styleElement.innerHTML = `
    @media only screen and (max-width: 576px) {
      /* Container principal */
      .reddit-comment-section {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      
      /* Comentarii - super compacte */
      .reddit-comment {
        margin: 4px 0 !important;
        padding: 8px 10px !important;
        border-radius: 8px !important;
        background-color: rgba(255, 255, 255, 0.7) !important;
        border: 1px solid #efefef !important;
        width: 100% !important;
        box-sizing: border-box !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      /* Extra resetare pentru text */
      .comment-text, .comment-author, .comment-time {
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
        text-align: left !important;
      }
      
      /* Comment replies - fără indentare, direct una sub alta */
      .comment-replies {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        width: 100% !important;
        max-width: 100% !important;
        position: static !important;
        left: 0 !important;
      }
      
      /* Resetare agresivă pentru orice element care ar putea cauza indentare */
      .comment-replies .reddit-comment,
      .comment-replies .comment-replies .reddit-comment,
      .comment-replies .comment-replies .comment-replies .reddit-comment {
        margin-left: 0 !important;
        padding-left: 10px !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        left: 0 !important;
      }
      
      /* Diferențiere vizuală a reply-urilor */
      .comment-replies .reddit-comment {
        background-color: transparent !important;
        border-color: #e9ecef !important;
      }
      
      /* Marker vertical pentru reply-uri */
      .comment-replies .reddit-comment::before {
        content: "" !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 3px !important;
        background-color: #4dabf7 !important;
        border-top-left-radius: 8px !important;
        border-bottom-left-radius: 8px !important;
        display: block !important;
      }
      
      /* Utilizează spațiul din stânga cât mai eficient */
      .reddit-comment,
      .comment-replies .reddit-comment,
      .comment-replies .comment-replies .reddit-comment,
      .comment-replies .comment-replies .comment-replies .reddit-comment {
        margin-left: -5px !important;
        width: calc(100% + 5px) !important;
        max-width: calc(100% + 5px) !important;
      }
    }
  `;
  
  // Adaugă stilul în head cu prioritate ridicată
  document.head.appendChild(styleElement);
};

// Apelăm funcția o singură dată când aplicația se încarcă
if (typeof window !== 'undefined') {
  // Asigură-te că DOM-ul este încărcat complet
  if (document.readyState === 'complete') {
    injectMobileStyles();
  } else {
    window.addEventListener('load', injectMobileStyles);
  }
}

const Comment = ({ comment, onReply, currentUser, onVoteComment, onDeleteComment, isAdmin, isModerator }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [hasUserUpvoted, setHasUserUpvoted] = useState(comment.has_user_upvoted || false);
  const [voteCount, setVoteCount] = useState(comment.votes || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const commentRepliesRef = useRef(null);

  // Dialog de confirmare
  const { isOpen, dialogConfig, confirmDialog, closeDialog } = useConfirmDialog();

  // Verifică dacă este pe mobil și aplică stiluri direct DOM-ului
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 576;
      setIsMobile(mobile);
    };

    // Verifică la încărcare
    checkMobile();

    // Verifică la redimensionare
    window.addEventListener('resize', checkMobile);
    
    // Aplică stiluri direct elementului dacă este pe mobil
    if (commentRepliesRef.current && isMobile) {
      const repliesElement = commentRepliesRef.current;
      
      // Resetare absolută - elimină toate stilurile care ar putea cauza indentare
      repliesElement.style.margin = '0';
      repliesElement.style.marginLeft = '0';
      repliesElement.style.marginRight = '0';
      repliesElement.style.marginTop = '2px';
      repliesElement.style.marginBottom = '0';
      repliesElement.style.padding = '0';
      repliesElement.style.paddingLeft = '0';
      repliesElement.style.border = 'none';
      repliesElement.style.borderLeft = 'none';
      repliesElement.style.width = '100%';
      repliesElement.style.maxWidth = '100%';
      repliesElement.style.boxSizing = 'border-box';
      repliesElement.style.position = 'static';
      repliesElement.style.left = '0';
      repliesElement.style.display = 'block';

      // Sfat: Extinde în stânga pentru a utiliza mai mult spațiu
      try {
        repliesElement.style.marginLeft = '-5px';
        repliesElement.style.width = 'calc(100% + 5px)';
        repliesElement.style.maxWidth = 'calc(100% + 5px)';
      } catch (e) {
        console.log('Nu se poate extinde în stânga', e);
      }
      
      // Determină nivelul de reply pentru a aplica stilul corect
      const isNestedReply = repliesElement.closest('.comment-replies .comment-replies') !== null;
      const isDeepNestedReply = repliesElement.closest('.comment-replies .comment-replies .comment-replies') !== null;
      
      // Aplică stiluri pentru toate reply-urile din container
      const replyComments = repliesElement.querySelectorAll('.reddit-comment');
      replyComments.forEach(reply => {
        // Stiluri absolute pentru reply-uri
        reply.style.position = 'relative';
        reply.style.margin = '3px 0';
        reply.style.marginLeft = '0';
        reply.style.padding = '8px 10px';
        reply.style.paddingLeft = '10px';
        reply.style.borderRadius = '8px';
        reply.style.border = '1px solid #e9ecef';
        reply.style.width = '100%';
        reply.style.maxWidth = '100%';
        reply.style.boxSizing = 'border-box';
        reply.style.wordBreak = 'break-word';
        reply.style.overflowWrap = 'break-word';
        reply.style.whiteSpace = 'normal';
        
        // Extinde în stânga pentru a utiliza mai mult spațiu
        try {
          reply.style.marginLeft = '-5px';
          reply.style.width = 'calc(100% + 5px)';
          reply.style.maxWidth = 'calc(100% + 5px)';
        } catch (e) {
          console.log('Nu se poate extinde în stânga pentru reply', e);
        }
        
        // Asigură-te că textul nu iese din ecran
        const textElement = reply.querySelector('.comment-text');
        if (textElement) {
          textElement.style.width = '100%';
          textElement.style.maxWidth = '100%';
          textElement.style.wordBreak = 'break-word';
          textElement.style.overflowWrap = 'break-word';
          textElement.style.whiteSpace = 'normal';
          textElement.style.textAlign = 'left';
        }
        
        // Asigură-te că numele autorului nu iese din ecran
        const authorElement = reply.querySelector('.comment-author');
        if (authorElement) {
          authorElement.style.maxWidth = '70%';
          authorElement.style.textOverflow = 'ellipsis';
          authorElement.style.overflow = 'hidden';
          authorElement.style.whiteSpace = 'nowrap';
        }
        
        // Diferențiere vizuală în funcție de nivel
        if (isDeepNestedReply) {
          reply.style.backgroundColor = 'transparent';
          reply.style.borderColor = '#ced4da';
        } else if (isNestedReply) {
          reply.style.backgroundColor = 'transparent';
          reply.style.borderColor = '#dee2e6';
        } else {
          reply.style.backgroundColor = 'transparent';
        }
        
        // Adaugă marker vertical colorat
        const existingMarker = reply.querySelector('.reply-marker');
        if (!existingMarker) {
          const marker = document.createElement('div');
          marker.className = 'reply-marker';
          
          marker.style.position = 'absolute';
          marker.style.left = '0';
          marker.style.top = '0';
          marker.style.bottom = '0';
          marker.style.width = '3px';
          marker.style.borderTopLeftRadius = '8px';
          marker.style.borderBottomLeftRadius = '8px';
          
          if (isDeepNestedReply) {
            marker.style.backgroundColor = '#a29bfe';
          } else if (isNestedReply) {
            marker.style.backgroundColor = '#6c5ce7';
          } else {
            marker.style.backgroundColor = '#4dabf7';
          }
          
          reply.appendChild(marker);
          
          // Adaugă și indicator textual la numele autorului
          if (authorElement) {
            // Indicator miniatural pentru nivelul de reply
            const replyIndicator = document.createElement('span');
            replyIndicator.style.fontSize = '8px';
            replyIndicator.style.fontWeight = 'bold';
            replyIndicator.style.marginLeft = '3px';
            
            if (isDeepNestedReply) {
              replyIndicator.textContent = " • R3+";
              replyIndicator.style.color = '#a29bfe';
            } else if (isNestedReply) {
              replyIndicator.textContent = " • R2";
              replyIndicator.style.color = '#6c5ce7';
            } else {
              replyIndicator.textContent = " • R1";
              replyIndicator.style.color = '#4dabf7';
            }
            
            authorElement.appendChild(replyIndicator);
          }
        }
        
        // Stil super-compact pentru butoane
        const collapseButton = reply.querySelector('.collapse-toggle-button');
        if (collapseButton) {
          collapseButton.style.padding = '1px 4px';
          collapseButton.style.fontSize = '7px';
          collapseButton.style.right = '6px';
          collapseButton.style.top = '4px';
          collapseButton.style.opacity = '0.8';
          collapseButton.style.borderRadius = '8px';
          collapseButton.style.position = 'absolute';
          collapseButton.style.zIndex = '10';
        }
        
        const deleteButton = reply.querySelector('.delete-comment-button');
        if (deleteButton) {
          deleteButton.style.padding = '1px 4px';
          deleteButton.style.fontSize = '7px';
          deleteButton.style.right = '55px';
          deleteButton.style.top = '4px';
          deleteButton.style.opacity = '0.8';
          deleteButton.style.borderRadius = '8px';
          deleteButton.style.position = 'absolute';
          deleteButton.style.zIndex = '10';
        }
        
        // Stil compact pentru butonul de reply
        const replyButton = reply.querySelector('.reply-button');
        if (replyButton) {
          replyButton.style.fontSize = '10px';
          replyButton.style.padding = '1px 3px';
        }
        
        // Stil compact pentru form-ul de reply
        const replyForm = reply.querySelector('.reply-form');
        if (replyForm) {
          replyForm.style.marginTop = '3px';
          replyForm.style.padding = '3px';
          replyForm.style.width = '100%';
          replyForm.style.boxSizing = 'border-box';
          
          const textarea = replyForm.querySelector('textarea');
          if (textarea) {
            textarea.style.minHeight = '40px';
            textarea.style.padding = '5px';
            textarea.style.fontSize = '12px';
            textarea.style.width = '100%';
            textarea.style.boxSizing = 'border-box';
          }
          
          const replyActions = replyForm.querySelector('.reply-actions');
          if (replyActions) {
            replyActions.style.marginTop = '3px';
            replyActions.style.display = 'flex';
            replyActions.style.justifyContent = 'flex-end';
            
            const buttons = replyActions.querySelectorAll('button');
            buttons.forEach(button => {
              button.style.padding = '2px 7px';
              button.style.fontSize = '10px';
            });
          }
        }
      });
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

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
    if (comment.id) {  // Adăugăm condiția pentru a evita log-uri inutile
      console.log(`Comment ID ${comment.id} - Delete button visibility check:`, {
        currentUser: currentUser?.uid,
      commentOwnerId: comment.owner_id,
        isDeleted,
      isAdmin,
      isModerator,
        canDeleteComment,
        match: currentUser?.uid === comment.owner_id
    });
    }
  }, [comment.id, comment.owner_id, currentUser, isDeleted, isAdmin, isModerator, canDeleteComment]);
  
  // Handler pentru ștergerea comentariului
  const handleDeleteComment = async () => {
    if (!canDeleteComment) return;
    
    // Folosim dialogul personalizat în loc de window.confirm
    const confirmed = await confirmDialog({
      title: 'Șterge comentariul',
      message: 'Ești sigur că vrei să ștergi acest comentariu?',
      confirmText: 'Șterge',
      cancelText: 'Anulează',
      confirmButtonClass: 'danger',
      icon: 'warning'
    });
    
    if (confirmed) {
      try {
        await onDeleteComment(comment.id);
      } catch (error) {
        console.error('Error deleting comment:', error);
        
        // Folosim un nou dialog pentru erori în loc de alert
        confirmDialog({
          title: 'Eroare',
          message: 'Nu s-a putut șterge comentariul. Încercați din nou.',
          confirmText: 'OK',
          cancelText: '',
          confirmButtonClass: 'primary',
          icon: 'warning',
          onCancel: closeDialog
        });
      }
    }
  };

  return (
    <>
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
                    rows="1"
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
                <div 
                  className="comment-replies" 
                  ref={commentRepliesRef}
                >
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
              title="Delete comment"
            >
              <FaTrash /> delete
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
      
      {/* Adăugăm dialogul de confirmare */}
      <ConfirmDialog
        isOpen={isOpen}
        {...dialogConfig}
      />
    </>
  );
};

export default Comment; 