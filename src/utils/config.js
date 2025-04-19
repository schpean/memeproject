// Configuration settings for the application
// Use a function to determine the API URL based on the client's origin
export const getApiBaseUrl = () => {
  // For production
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_BASE_URL || 'https://bossme.me';
  }
  // For development
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337';
};

// Export API_BASE_URL using the function above
export const API_BASE_URL = getApiBaseUrl();

// Client base URL for redirect operations
export const CLIENT_BASE_URL = process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_CLIENT_BASE_URL || 'https://bossme.me')
    : (process.env.REACT_APP_CLIENT_BASE_URL || 'http://localhost:1337');

// Create WebSocket URL from the API base URL
const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
const wsBaseURL = API_BASE_URL.replace(/^https?:\/\//, `${wsProtocol}://`);
export const WS_URL = `${wsBaseURL}/ws`;

// Fallback HTTP polling URL for environments where WebSockets are blocked
export const POLLING_URL = `${API_BASE_URL}/api/updates`;

// Constantele pentru providerii de autentificare
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  APPLE: 'apple',
  EMAIL: 'email'
};

// IMPORTANT: Acest obiect defineşte toate endpoint-urile API utilizate în aplicaţie
export const API_ENDPOINTS = {
  // Auth endpoints
  googleAuth: '/users/google-auth',
  appleAuth: '/users/apple-auth',
  emailAuth: '/users/email-login',
  updateNickname: '/users/update-nickname',
  verifyEmail: '/verify-email',
  resendVerification: '/resend-verification',
  
  // Helper pentru endpoint-uri de autentificare în funcție de provider
  authEndpoint: (provider) => {
    switch(provider) {
      case AUTH_PROVIDERS.GOOGLE:
        return '/users/google-auth';
      case AUTH_PROVIDERS.APPLE:
        return '/users/apple-auth';
      case AUTH_PROVIDERS.EMAIL:
        return '/users/email-login';
      default:
        return '/users/google-auth';
    }
  },
  
  // User endpoints
  users: '/users',
  userStats: (id) => `/admin/users/${id}/stats`,
  deleteUser: (id) => `/admin/users/${id}`,
  currentUser: '/users/me',
  userMemes: '/users/me/memes',
  userUpvotes: (userId) => `/users/${userId}/upvoted`,
  
  // Admin endpoints
  adminUsers: '/admin/users',
  adminRoles: '/admin/roles',
  updateUserRole: (userId) => `/admin/users/${userId}/role`,
  
  // Meme endpoints
  memes: '/memes',
  meme: (id) => `/memes/${id}`,
  memesTop: '/memes/top',
  memeVote: (id) => `/memes/${id}/vote`,
  memePending: '/memes/pending',
  memeApproval: (id) => `/memes/${id}/approval`,
  
  // Comment endpoints
  getComments: (memeId) => `/memes/${memeId}/comments`,
  addComment: (memeId) => `/memes/${memeId}/comments`,
  commentVote: (memeId, commentId) => `/memes/${memeId}/comments/${commentId}/vote`,
  deleteComment: (memeId, commentId) => `/memes/${memeId}/comments/${commentId}`,
  
  // Updates endpoint
  updates: '/api/updates',
  
  // WebSocket endpoint
  websocket: WS_URL,
  polling: POLLING_URL,
  
  // Helper function pentru construirea URL-urilor cu parametri
  buildUrl: (endpoint, params = {}) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    return url.toString();
  }
}; 