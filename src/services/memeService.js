import apiService from './apiService';
import { API_ENDPOINTS } from '../utils/config';

const memeService = {
  // Get all memes with optional filters
  getMemes: async (filters = {}) => {
    return apiService.get(API_ENDPOINTS.buildUrl(API_ENDPOINTS.memes, filters));
  },

  // Get a single meme by ID
  getMemeById: async (id) => {
    return apiService.get(API_ENDPOINTS.meme(id));
  },

  // Get top memes
  getTopMemes: async () => {
    return apiService.get(API_ENDPOINTS.memesTop);
  },

  // Get pending memes (admin/moderator only)
  getPendingMemes: async () => {
    return apiService.get(API_ENDPOINTS.memePending);
  },

  // Vote on a meme
  voteMeme: async (id, voteType) => {
    return apiService.post(API_ENDPOINTS.memeVote(id), { voteType });
  },

  // Create a new meme
  createMeme: async (memeData) => {
    if (memeData instanceof FormData) {
      return apiService.upload(API_ENDPOINTS.memes, memeData);
    }
    return apiService.post(API_ENDPOINTS.memes, memeData);
  },

  // Update meme approval status (admin/moderator only)
  updateApprovalStatus: async (id, status, reason) => {
    return apiService.put(API_ENDPOINTS.memeApproval(id), { status, reason });
  },

  // Get user's memes
  getUserMemes: async () => {
    return apiService.get(API_ENDPOINTS.userMemes);
  }
};

export default memeService; 