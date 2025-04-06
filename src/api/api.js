import axios from 'axios';
import { API_BASE_URL } from '../config/config';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests when available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Meme-related API calls
export const memeApi = {
  // Get all memes with optional filters
  getMemes: async (params = {}) => {
    try {
      const response = await api.get('/memes', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching memes:', error);
      throw error;
    }
  },
  
  // Get a single meme by ID
  getMemeById: async (id) => {
    try {
      const response = await api.get(`/memes/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching meme ${id}:`, error);
      throw error;
    }
  },
  
  // Create a new meme
  createMeme: async (memeData) => {
    try {
      const response = await api.post('/memes', memeData);
      return response.data;
    } catch (error) {
      console.error('Error creating meme:', error);
      throw error;
    }
  },
  
  // Upvote a meme
  upvoteMeme: async (id) => {
    try {
      // Get current user from localStorage
      const userString = localStorage.getItem('memeUser');
      if (!userString) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userString);
      const userId = user.uid;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Check if meme is already upvoted (toggle functionality)
      const upvotedMemes = JSON.parse(localStorage.getItem('upvotedMemes') || '[]');
      const voteType = upvotedMemes.includes(parseInt(id)) || upvotedMemes.includes(id) ? 'down' : 'up';
      
      const response = await api.post(`/memes/${id}/vote`, { 
        userId: userId,
        voteType: voteType
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error handling vote for meme ${id}:`, error);
      throw error;
    }
  },
  
  // Get top trending memes
  getTopMemes: async (limit = 10) => {
    try {
      const response = await api.get('/memes/top', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Error fetching top memes:', error);
      throw error;
    }
  }
};

// Comment-related API calls
export const commentApi = {
  // Get comments for a meme
  getComments: async (memeId) => {
    try {
      const response = await api.get(`/memes/${memeId}/comments`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching comments for meme ${memeId}:`, error);
      throw error;
    }
  },
  
  // Add a comment to a meme
  addComment: async (memeId, commentData) => {
    try {
      // Get current user from localStorage
      const userString = localStorage.getItem('memeUser');
      if (!userString) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userString);
      const userId = user.uid;
      const username = user.username;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Add userId and username to comment data
      const enrichedCommentData = {
        ...commentData,
        userId,
        username
      };
      
      const response = await api.post(`/memes/${memeId}/comments`, enrichedCommentData);
      return response.data;
    } catch (error) {
      console.error(`Error adding comment to meme ${memeId}:`, error);
      throw error;
    }
  },
  
  // Upvote a comment (toggle functionality)
  upvoteComment: async (memeId, commentId) => {
    try {
      // Get current user from localStorage
      const userString = localStorage.getItem('memeUser');
      if (!userString) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(userString);
      const userId = user.uid;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Check if comment is already upvoted (toggle functionality)
      const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
      const voteType = upvotedComments.includes(parseInt(commentId)) || upvotedComments.includes(commentId) ? 'down' : 'up';
      
      // Log what we're sending for debugging
      console.log(`Voting ${voteType} on comment ${commentId} for meme ${memeId} with user ID ${userId}`);
      
      const response = await api.post(`/memes/${memeId}/comments/${commentId}/vote`, { 
        userId: userId,
        voteType: voteType 
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error voting on comment ${commentId}:`, error);
      
      // Only track up votes in storage
      if (error.response && error.response.status === 400 && 
          error.response.data && error.response.data.error === 'You have already voted for this comment') {
        console.log('User already voted for this comment');
        
        // Add to local storage to prevent future attempts
        const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
        if (!upvotedComments.includes(commentId)) {
          upvotedComments.push(commentId);
          localStorage.setItem('upvotedComments', JSON.stringify(upvotedComments));
        }
      }
      
      throw error;
    }
  }
};

// User-related API calls
export const userApi = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/users/profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
  
  // Get user's upvoted memes
  getUpvotedMemes: async () => {
    try {
      const response = await api.get('/users/upvoted');
      return response.data;
    } catch (error) {
      console.error('Error fetching upvoted memes:', error);
      throw error;
    }
  }
};

export default {
  memeApi,
  commentApi,
  userApi
}; 