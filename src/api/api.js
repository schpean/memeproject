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
    console.error('API Error:', error.message || 'Unknown error');
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
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
  upvoteMeme: async (id, isUpvoted) => {
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
      
      // If isUpvoted is passed, use it to determine vote type, otherwise check localStorage
      let voteType;
      if (isUpvoted !== undefined) {
        voteType = isUpvoted ? 'down' : 'up';
      } else {
        // Check if meme is already upvoted (toggle functionality)
        const upvotedMemes = JSON.parse(localStorage.getItem('upvotedMemes') || '[]');
        voteType = upvotedMemes.includes(parseInt(id)) || upvotedMemes.includes(id) ? 'down' : 'up';
      }
      
      try {
        const response = await api.post(`/memes/${id}/vote`, { 
          userId: userId,
          voteType: voteType
        });
        
        return response.data;
      } catch (error) {
        // Handle 400 errors gracefully
        if (error.response && error.response.status === 400) {
          console.log('Vote status error:', error.response.data.error);
          
          // If trying to upvote but already voted, return the meme with current votes
          if (voteType === 'up' && error.response.data.error === 'You have already voted for this meme') {
            // Update local storage to reflect server state
            const upvotedMemes = JSON.parse(localStorage.getItem('upvotedMemes') || '[]');
            if (!upvotedMemes.includes(id)) {
              upvotedMemes.push(id);
              localStorage.setItem('upvotedMemes', JSON.stringify(upvotedMemes));
            }
            
            // Get the current meme data
            const memeResponse = await api.get(`/memes/${id}`);
            return memeResponse.data;
          }
          
          // If trying to unvote but never voted, return the meme with current votes
          if (voteType === 'down' && error.response.data.error === 'You have not voted for this meme yet') {
            // Update local storage to reflect server state
            const upvotedMemes = JSON.parse(localStorage.getItem('upvotedMemes') || '[]');
            const updatedUpvotes = upvotedMemes.filter(memeId => memeId != id);
            localStorage.setItem('upvotedMemes', JSON.stringify(updatedUpvotes));
            
            // Get the current meme data
            const memeResponse = await api.get(`/memes/${id}`);
            return memeResponse.data;
          }
        }
        
        // Re-throw other errors
        throw error;
      }
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
  upvoteComment: async (memeId, commentId, isUpvoted) => {
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
      
      // If isUpvoted is passed, use it to determine vote type, otherwise check localStorage
      let voteType;
      if (isUpvoted !== undefined) {
        voteType = isUpvoted ? 'down' : 'up';
      } else {
        // Check if comment is already upvoted (toggle functionality)
        const upvotedComments = JSON.parse(localStorage.getItem('upvotedComments') || '[]');
        voteType = upvotedComments.includes(parseInt(commentId)) || upvotedComments.includes(commentId) ? 'down' : 'up';
      }
      
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
  },
  
  // Update user nickname (can only be done once)
  updateNickname: async (newNickname) => {
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
      
      // Check if nickname has already been changed
      if (user.nickname_changed) {
        console.warn('Nickname already changed for this user');
        throw new Error('You can only change your nickname once');
      }
      
      let response;
      try {
        // First try with axios
        response = await api.post(API_ENDPOINTS.updateNickname, {
          userId: userId,
          newNickname: newNickname
        });
      } catch (axiosError) {
        console.error('Request failed, trying alternative method');
        
        // Fallback to fetch API if axios fails
        const fetchResponse = await fetch(API_ENDPOINTS.updateNickname, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            newNickname: newNickname
          })
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Request failed with status: ${fetchResponse.status}`);
        }
        
        response = { data: await fetchResponse.json() };
      }
      
      // Update the user in localStorage with the new nickname
      const updatedUser = {
        ...user,
        username: response.data.username,
        displayName: response.data.display_name,
        nickname_changed: true // Ensure this is set properly
      };
      
      localStorage.setItem('memeUser', JSON.stringify(updatedUser));
      
      return response.data;
    } catch (error) {
      console.error('Error updating nickname');
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