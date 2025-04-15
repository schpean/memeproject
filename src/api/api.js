import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../utils/config';

// Store pentru a păstra track de numărul de cereri active
// Folosim un obiect în loc de un număr simplu pentru a face referința mutabilă
const activeRequestsStore = { count: 0 };

// Funcție pentru a obține store-ul AuthContext din afara contextului React
// Va fi setată din afară după inițializarea aplicației
let getAuthContext = () => ({ 
  startGlobalLoading: () => console.warn('AuthContext not yet initialized'),
  stopGlobalLoading: () => console.warn('AuthContext not yet initialized')
});

// Funcție pentru a seta getter-ul pentru AuthContext
export const setAuthContextGetter = (getter) => {
  getAuthContext = getter;
};

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

// Request interceptor with loading indicator
api.interceptors.request.use(config => {
  // Incrementăm numărul de cereri active
  activeRequestsStore.count++;
  
  // Afișăm indicatorul de loading doar dacă durează mai mult de 300ms
  // pentru a evita flickering pentru cereri rapide
  const loadingTimeout = setTimeout(() => {
    if (activeRequestsStore.count > 0) {
      const authContext = getAuthContext();
      if (authContext?.startGlobalLoading) {
        authContext.startGlobalLoading();
      }
    }
  }, 300);
  
  // Stocăm timeout-ul în config pentru a-l putea anula mai târziu
  config._loadingTimeout = loadingTimeout;
  
  // Add auth token to requests when available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, error => {
  // În caz de eroare, ne asigurăm că decrementăm contorul
  activeRequestsStore.count = Math.max(0, activeRequestsStore.count - 1);
  
  // Și ascundem loading-ul dacă nu mai sunt cereri active
  if (activeRequestsStore.count === 0) {
    const authContext = getAuthContext();
    if (authContext?.stopGlobalLoading) {
      authContext.stopGlobalLoading();
    }
  }
  
  return Promise.reject(error);
});

// Response interceptor with loading indicator and error handling
api.interceptors.response.use(
  response => {
    // Decrementăm numărul de cereri active
    activeRequestsStore.count = Math.max(0, activeRequestsStore.count - 1);
    
    // Anulăm timeout-ul dacă încă există
    if (response.config._loadingTimeout) {
      clearTimeout(response.config._loadingTimeout);
    }
    
    // Ascundem loading-ul dacă nu mai sunt cereri active
    if (activeRequestsStore.count === 0) {
      const authContext = getAuthContext();
      if (authContext?.stopGlobalLoading) {
        authContext.stopGlobalLoading();
      }
    }
    
    return response;
  },
  error => {
    // Decrementăm numărul de cereri active
    activeRequestsStore.count = Math.max(0, activeRequestsStore.count - 1);
    
    // Anulăm timeout-ul dacă încă există
    if (error.config?._loadingTimeout) {
      clearTimeout(error.config._loadingTimeout);
    }
    
    // Ascundem loading-ul dacă nu mai sunt cereri active
    if (activeRequestsStore.count === 0) {
      const authContext = getAuthContext();
      if (authContext?.stopGlobalLoading) {
        authContext.stopGlobalLoading();
      }
    }
    
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

// Helper function to parse user data from localStorage
const getCurrentUser = () => {
  try {
    console.log('getCurrentUser called');
    const userString = localStorage.getItem('memeUser');
    if (!userString) {
      console.log('No user found in localStorage');
      return null;
    }
    
    const user = JSON.parse(userString);
    if (!user || !user.uid) {
      console.log('Invalid user object in localStorage:', user);
      return null;
    }
    
    // Verifică dacă există și token-ul
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Warning: User exists in localStorage but token is missing');
    }
    
    console.log('Current user from localStorage:', {
      uid: user.uid,
      username: user.username || user.displayName,
      hasToken: !!token
    });
    
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
      const user = getCurrentUser();
      const headers = user ? { 'user-id': user.uid } : {};
      const response = await api.get(`/memes/${id}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching meme ${id}:`, error);
      throw error;
    }
  },
  
  // Get all memes for the current user
  getUserMemes: async () => {
    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('User not logged in');
      }
      
      const response = await api.get('/users/me/memes', {
        headers: { 'user-id': user.uid }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user memes:', error);
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
    
    console.log('Vote operation on comment:', commentId, 'for meme:', memeId);
    console.log('Current user:', user.uid);
    console.log('Operation type:', isRemovingVote ? 'Removing vote' : 'Adding vote');
    
    try {
      // Simplificăm logica - voteType este 'up' pentru a adăuga vot, 'down' pentru a elimina vot
      const voteType = isRemovingVote ? 'down' : 'up';
      
      const response = await api.post(`/memes/${memeId}/comments/${commentId}/vote`, {
        userId: user.uid,
        voteType: voteType
      });
      
      console.log('Vote operation successful, new vote count:', response.data.votes);
      
      // Asigurăm că voturile nu sunt negative
      const safeResponse = {
        ...response.data,
        votes: Math.max(0, response.data.votes || 0)
      };
      
      return safeResponse;
    } catch (error) {
      console.error(`Error with comment vote operation:`, error);
      
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        // Verifică erori specifice și tratează-le corespunzător
        if (error.response.status === 404 && error.response.data.error === 'User not found') {
          alert('Trebuie să vă autentificați din nou pentru a vota comentarii.');
        } else if (error.response.status === 400) {
          // Tratăm erori 400 ca inconsistențe între client și server
          // Încercăm să obținem starea actuală a comentariului
          try {
            const commentResponse = await api.get(`/memes/${memeId}/comments`);
            const targetComment = commentResponse.data.find(c => c.id === commentId);
            if (targetComment) {
              return {
                ...targetComment,
                votes: Math.max(0, targetComment.votes || 0)
              };
            }
          } catch (secondaryError) {
            console.error('Failed to recover comment state:', secondaryError);
          }
        }
      }
      
      throw error;
    }
  },
  
  // "Delete" a comment (mark as deleted)
  deleteComment: async (memeId, commentId) => {
    if (!memeId || !commentId) {
      throw new Error('Meme ID and Comment ID are required');
    }
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await api.delete(`/memes/${memeId}/comments/${commentId}`, {
        data: {
          userId: user.uid
        }
      });
      
      return response.data.comment; // Returnăm comentariul actualizat
    } catch (error) {
      console.error('Error deleting comment:', error);
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
  
  // Adaugă funcția updateNickname
  updateNickname: async (newNickname) => {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    
    if (!newNickname || newNickname.trim().length < 3) {
      throw new Error('Nickname must be at least 3 characters');
    }
    
    try {
      const response = await api.post(API_ENDPOINTS.updateNickname, {
        userId: user.uid,
        newNickname: newNickname
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.error || 'Failed to update nickname');
      }
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