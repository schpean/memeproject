// Configuration settings for the application
// Use a function to determine the API URL based on the client's origin
function getApiBaseUrl() {
  // If we're running from 192.168.0.104, use the corresponding server
  if (window.location.hostname === '192.168.0.104') {
    return 'http://86.120.25.207:1337';
  }
  // For localhost or other domains
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337';
}

export const API_BASE_URL = getApiBaseUrl();
export const CLIENT_BASE_URL = process.env.REACT_APP_CLIENT_BASE_URL || 'http://localhost:1338';

// Create WebSocket URL from the API base URL
const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
const wsBaseURL = API_BASE_URL.replace(/^https?:\/\//, `${wsProtocol}://`);
export const WS_URL = `${wsBaseURL}/ws`;

// Fallback HTTP polling URL for environments where WebSockets are blocked
export const POLLING_URL = `${API_BASE_URL}/api/updates`;

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
  // Add filtered meme endpoints
  filteredMemes: (params) => {
    const url = new URL(`${API_BASE_URL}/memes`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
      });
    }
    return url.toString();
  },
  
  // Comment-related endpoints
  getComments: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  addComment: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  
  // Auth-related endpoints
  googleAuth: `${API_BASE_URL}/users/google-auth`,
  updateNickname: `${API_BASE_URL}/users/update-nickname`,
  userUpvotes: (userId) => `${API_BASE_URL}/users/${userId}/upvoted`,
  
  // Admin endpoints
  adminUsers: `${API_BASE_URL}/admin/users`,
  adminRoles: `${API_BASE_URL}/admin/roles`,
  updateUserRole: (userId) => `${API_BASE_URL}/admin/users/${userId}/role`,
  userStats: (userId) => `${API_BASE_URL}/users/${userId}/stats`,
  deleteUser: (userId) => `${API_BASE_URL}/users/${userId}`,
  
  // User management endpoints
  currentUser: `${API_BASE_URL}/users/me`
}; 