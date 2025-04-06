import React, { useState, useContext, useEffect } from 'react';
import { FaComment } from 'react-icons/fa';
import Comment from './Comment';
import AuthContext from '../../contexts/AuthContext';
import { commentApi } from '../../api/api';
import { getDicebearAvatarUrl } from '../../utils/avatarUtils';
import './styles/CommentSection.css';

const CommentSection = ({ memeId, initialComments = [] }) => {
  const { currentUser } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const INITIAL_COMMENT_COUNT = 5;
  
  // Format comments into a tree structure
  useEffect(() => {
    const commentTree = buildCommentTree(initialComments);
    setComments(commentTree);
  }, [initialComments]);
  
  // Function to build a comment tree from flat comments
  const buildCommentTree = (flatComments) => {
    const commentMap = {};
    const rootComments = [];
    
    // First pass: create a map of comments by ID
    flatComments.forEach(comment => {
      // Create a copy with an empty replies array
      commentMap[comment.id] = { ...comment, replies: [] };
    });
    
    // Second pass: connect parents and children
    flatComments.forEach(comment => {
      if (comment.parentId) {
        // This is a reply to another comment
        const parent = commentMap[comment.parentId];
        if (parent) {
          parent.replies.push(commentMap[comment.id]);
        } else {
          // If parent doesn't exist, add it as a root level comment
          rootComments.push(commentMap[comment.id]);
        }
      } else {
        // This is a root level comment
        rootComments.push(commentMap[comment.id]);
      }
    });
    
    // Sort comments by votes
    rootComments.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    
    return rootComments;
  };
  
  // Handle new comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Please log in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const username = currentUser.username || currentUser.displayName || 'Anonymous';
      const commentData = {
        userId: currentUser.uid,
        username: username,
        userAvatar: getDicebearAvatarUrl(username),
        content: newComment,
        parentId: null // Root level comment
      };
      
      const newCommentData = await commentApi.addComment(memeId, commentData);
      
      // Add the new comment to the tree
      const updatedComments = [
        { ...newCommentData, replies: [] }, 
        ...comments
      ];
      
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle upvoting a comment
  const handleVoteComment = async (commentId, isUpvoted) => {
    if (!currentUser) {
      alert('Please log in to upvote comments');
      return null;
    }
    
    try {
      // Call the API to upvote the comment
      const updatedComment = await commentApi.upvoteComment(memeId, commentId, isUpvoted);
      
      // Update the comment in our tree
      const updatedComments = updateCommentInTree(comments, commentId, updatedComment);
      
      // Resort comments after vote changes
      const sortedComments = [...updatedComments].sort((a, b) => (b.votes || 0) - (a.votes || 0));
      setComments(sortedComments);
      
      return updatedComment;
    } catch (error) {
      console.error('Error upvoting comment:', error);
      
      // Check if this is an "already voted" error, which we can handle gracefully
      if (error.response && error.response.status === 400 && 
          error.response.data && error.response.data.error === 'You have already voted for this comment') {
        
        // Find the comment and return it (with votes unchanged) to avoid UI errors
        const comment = findCommentById(comments, commentId);
        if (comment) {
          // Return the comment with votes unchanged to avoid errors
          return comment;
        }
      }
      
      throw error;
    }
  };
  
  // Helper to find a comment by ID in the tree
  const findCommentById = (commentList, commentId) => {
    for (const comment of commentList) {
      if (comment.id === commentId) {
        return comment;
      }
      
      if (comment.replies && comment.replies.length > 0) {
        const foundInReplies = findCommentById(comment.replies, commentId);
        if (foundInReplies) {
          return foundInReplies;
        }
      }
    }
    
    return null;
  };
  
  // Update a specific comment in the tree
  const updateCommentInTree = (commentTree, commentId, updatedComment) => {
    return commentTree.map(comment => {
      if (comment.id === commentId) {
        // Return the updated comment with its original replies
        return { ...updatedComment, replies: comment.replies };
      } else if (comment.replies && comment.replies.length > 0) {
        // Check the replies recursively
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, updatedComment)
        };
      }
      return comment;
    });
  };
  
  // Handle replies to comments
  const handleReply = async (parentId, content) => {
    if (!currentUser) {
      alert('Please log in to reply');
      return;
    }
    
    try {
      const username = currentUser.username || currentUser.displayName || 'Anonymous';
      const commentData = {
        userId: currentUser.uid,
        username: username,
        userAvatar: getDicebearAvatarUrl(username),
        content,
        parentId // Store the parent ID for properly building the tree
      };
      
      const newReplyData = await commentApi.addComment(memeId, commentData);
      
      // Create an updated copy of the comments with the new reply
      const updatedComments = addReplyToTree(comments, parentId, { 
        ...newReplyData, 
        replies: [] 
      });
      
      setComments(updatedComments);
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    }
  };
  
  // Helper function to add a reply to the tree structure
  const addReplyToTree = (commentList, parentId, newReply) => {
    return commentList.map(comment => {
      if (comment.id === parentId) {
        // Add the reply to this comment
        return {
          ...comment,
          replies: [newReply, ...comment.replies]
        };
      } else if (comment.replies && comment.replies.length > 0) {
        // Check the replies recursively
        return {
          ...comment,
          replies: addReplyToTree(comment.replies, parentId, newReply)
        };
      }
      return comment;
    });
  };
  
  // Get total comment count including replies
  const totalCommentCount = (commentTree) => {
    let count = 0;
    
    const countComments = (comments) => {
      comments.forEach(comment => {
        count++;
        if (comment.replies && comment.replies.length > 0) {
          countComments(comment.replies);
        }
      });
    };
    
    countComments(commentTree);
    return count;
  };

  // Get displayed comments (limited or all)
  const getDisplayedComments = () => {
    if (showAllComments || comments.length <= INITIAL_COMMENT_COUNT) {
      return comments;
    }
    return comments.slice(0, INITIAL_COMMENT_COUNT);
  };

  return (
    <div className="reddit-comment-section">
      <h3 className="comments-header">
        <FaComment className="comments-icon" />
        <span>{totalCommentCount(comments)} Comments</span>
      </h3>
      
      {/* Comment Form */}
      <div className="comment-form-container">
        {currentUser ? (
          <form className="reddit-comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="What are your thoughts?"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="comment-submit" 
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? 'Posting...' : 'Comment'}
            </button>
          </form>
        ) : (
          <div className="login-prompt">
            Log in to leave a comment
          </div>
        )}
      </div>
      
      {/* Comment List */}
      <div className="comment-list">
        {comments.length > 0 ? (
          <>
            {getDisplayedComments().map(comment => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onVoteComment={handleVoteComment}
                currentUser={currentUser}
              />
            ))}
            
            {/* Show more/less button */}
            {comments.length > INITIAL_COMMENT_COUNT && (
              <button 
                className="show-more-comments" 
                onClick={() => setShowAllComments(!showAllComments)}
              >
                {showAllComments ? 'Show Less' : `Show ${comments.length - INITIAL_COMMENT_COUNT} More Comments`}
              </button>
            )}
          </>
        ) : (
          <div className="no-comments">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection; 