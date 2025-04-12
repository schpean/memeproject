// Configuration settings for the application
export const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_API_BASE_URL || 'https://bossme.me')
    : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337');

export const CLIENT_BASE_URL = process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_CLIENT_BASE_URL || 'https://bossme.me')
    : (process.env.REACT_APP_CLIENT_BASE_URL || 'http://localhost:1337');

// Use same HTTP port for WebSocket to avoid firewall issues
// This should work even if actual WebSocket connections are blocked
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
  
  // Meme approval endpoints
  pendingMemes: `${API_BASE_URL}/memes/pending`,
  memeApproval: (id) => `${API_BASE_URL}/memes/${id}/approval`,
  
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
  
  // User management endpoints
  currentUser: `${API_BASE_URL}/users/me`
}; 