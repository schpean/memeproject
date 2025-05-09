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

// IMPORTANT: Acest obiect defineşte toate endpoint-urile API utilizate în aplicaţie
// Important! Când se adaugă endpoint-uri noi în server.js, adaugă-le și aici pentru consistență
export const API_ENDPOINTS = {
  // Base endpoints
  memes: `${API_BASE_URL}/memes`,
  users: `${API_BASE_URL}/users`,
  
  // WebSocket endpoint with polling fallback
  websocket: WS_URL,
  polling: POLLING_URL,
  
  // Meme-related endpoints
  getMeme: (id) => `${API_BASE_URL}/memes/${id}`,
  vote: (id) => `${API_BASE_URL}/memes/${id}/vote`,
  topMemes: `${API_BASE_URL}/memes/top`,
  memesByCompany: (company) => `${API_BASE_URL}/memes?company=${encodeURIComponent(company)}`,
  
  // Add filtered meme endpoints - This helper function constructs URLs with query parameters
  filteredMemes: (params) => {
    const url = new URL(`${API_BASE_URL}/memes`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
      });
    }
    return url.toString();
  },
  
  // Meme approval endpoints
  pendingMemes: `${API_BASE_URL}/memes/pending`,
  memeApproval: (id) => `${API_BASE_URL}/memes/${id}/approval`,
  
  // Comment-related endpoints
  getComments: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  addComment: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  voteComment: (memeId, commentId) => `${API_BASE_URL}/memes/${memeId}/comments/${commentId}/vote`,
  
  // Auth-related endpoints
  googleAuth: `${API_BASE_URL}/users/google-auth`,
  updateNickname: `${API_BASE_URL}/users/update-nickname`,
  userUpvotes: (userId) => `${API_BASE_URL}/users/${userId}/upvoted`,
  userMemes: `${API_BASE_URL}/users/me/memes`,
  
  // Admin endpoints
  adminUsers: `${API_BASE_URL}/admin/users`,
  adminRoles: `${API_BASE_URL}/admin/roles`,
  updateUserRole: (userId) => `${API_BASE_URL}/admin/users/${userId}/role`,
  userStats: (userId) => `${API_BASE_URL}/users/${userId}/stats`,
  deleteUser: (userId) => `${API_BASE_URL}/users/${userId}`,
  
  // User management endpoints
  currentUser: `${API_BASE_URL}/users/me`
}; 