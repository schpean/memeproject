import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/config';

console.log('API Configuration:', { 
  baseURL: API_BASE_URL,
  endpoints: API_ENDPOINTS ? 'Available' : 'Not available'
});

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Include credentials with all requests
  timeout: 10000 // 10 second timeout
});

// Add error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Avoid logging 401s for authentication routes as they're expected
    const isAuthRoute = error.config?.url?.includes('/auth/');
    if (!isAuthRoute || error.response?.status !== 401) {
      console.error('API Error:', error.message || 'Unknown error');
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
    }
    return Promise.reject(error);
  }
);

// Add auth token to requests when available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Helper function to parse user data from localStorage
const getCurrentUser = () => {
  try {
    const userString = localStorage.getItem('memeUser');
    if (!userString) return null;
    
    const user = JSON.parse(userString);
    if (!user || !user.uid) return null;
    
    return user;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Helper function to safely parse array from localStorage
const getSavedArray = (key, defaultValue = []) => {
  try {
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return defaultValue;
  }
};

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
    if (!id) {
      throw new Error('Meme ID is required');
    }
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
    if (!memeData) {
      throw new Error('Meme data is required');
    }
    try {
      const response = await api.post('/memes', memeData);
      return response.data;
    } catch (error) {
      console.error('Error creating meme:', error);
      throw error;
    }
  },
  
  // Upvote a meme
  upvoteMeme: async (id, isUpvoted) => {
    if (!id) {
      throw new Error('Meme ID is required');
    }
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    // Determine vote type based on current upvote status
    const voteType = isUpvoted !== undefined 
      ? (isUpvoted ? 'down' : 'up') 
      : (getSavedArray('upvotedMemes').includes(Number(id)) || getSavedArray('upvotedMemes').includes(id) ? 'down' : 'up');
    
    try {
      const response = await api.post(`/memes/${id}/vote`, { 
        userId: user.uid,
        voteType: voteType
      });
      
      return response.data;
    } catch (error) {
      // Handle known error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.error;
        const isAlreadyVoted = errorMessage === 'You have already voted for this meme';
        const isNeverVoted = errorMessage === 'You have not voted for this meme yet';
        
        if ((voteType === 'up' && isAlreadyVoted) || (voteType === 'down' && isNeverVoted)) {
          // Update localStorage to match server state
          const upvotedMemes = getSavedArray('upvotedMemes');
          
          if (voteType === 'up' && !upvotedMemes.includes(id)) {
            localStorage.setItem('upvotedMemes', JSON.stringify([...upvotedMemes, id]));
          } else if (voteType === 'down') {
            localStorage.setItem('upvotedMemes', JSON.stringify(upvotedMemes.filter(memeId => memeId != id)));
          }
          
          // Get current meme data
          const memeResponse = await api.get(`/memes/${id}`);
          return memeResponse.data;
        }
      }
      
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
    if (!memeId) {
      throw new Error('Meme ID is required');
    }
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
    if (!memeId) {
      throw new Error('Meme ID is required');
    }
    if (!commentData) {
      throw new Error('Comment data is required');
    }
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    // Add userId and username to comment data
    const enrichedCommentData = {
      ...commentData,
      userId: user.uid,
      username: user.username || user.displayName || 'Anonymous'
    };
    
    try {
      const response = await api.post(`/memes/${memeId}/comments`, enrichedCommentData);
      return response.data;
    } catch (error) {
      console.error(`Error adding comment to meme ${memeId}:`, error);
      throw error;
    }
  },
  
  // Upvote a comment
  upvoteComment: async (memeId, commentId, isRemovingVote = false) => {
    if (!memeId || !commentId) {
      throw new Error('Meme ID and Comment ID are required');
    }
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await api.post(`/memes/${memeId}/comments/${commentId}/vote`, {
        userId: user.uid,
        voteType: isRemovingVote ? 'down' : 'up'
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error upvoting comment ${commentId} on meme ${memeId}:`, error);
      throw error;
    }
  }
};

// User-related API calls
export const userApi = {
  // Get current user profile
  getCurrentProfile: async () => {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await api.get(`/users/${user.uid}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Get all users (admin only)
  getAllUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  
  // Update user permissions (admin only)
  updateUserPermissions: async (userId, permissions) => {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!permissions) {
      throw new Error('Permissions data is required');
    }
    
    try {
      const response = await api.put(`/users/${userId}/permissions`, permissions);
      return response.data;
    } catch (error) {
      console.error(`Error updating permissions for user ${userId}:`, error);
      throw error;
    }
  }
};

// Remove duplicate named exports
// export { memeApi, commentApi, userApi };

// Default export for backward compatibility
export default {
  memeApi,
  commentApi,
  userApi
}; 