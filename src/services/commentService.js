import apiService from './apiService';
import { API_ENDPOINTS } from '../utils/config';

const commentService = {
  // Get comments for a meme
  getComments: async (memeId) => {
    return apiService.get(API_ENDPOINTS.getComments(memeId));
  },

  // Add a comment to a meme
  addComment: async (memeId, content, parentId = null) => {
    return apiService.post(API_ENDPOINTS.addComment(memeId), {
      content,
      parentId
    });
  },

  // Vote on a comment
  voteComment: async (memeId, commentId, voteType) => {
    return apiService.post(API_ENDPOINTS.commentVote(memeId, commentId), {
      voteType
    });
  },

  // Delete a comment
  deleteComment: async (memeId, commentId) => {
    return apiService.delete(API_ENDPOINTS.deleteComment(memeId, commentId));
  }
};

export default commentService; 