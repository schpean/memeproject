// Configuration settings for the application
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337';
export const CLIENT_BASE_URL = process.env.REACT_APP_CLIENT_BASE_URL || 'http://localhost:1338';

export const API_ENDPOINTS = {
  // Base endpoints
  memes: `${API_BASE_URL}/memes`,
  users: `${API_BASE_URL}/users`,
  
  // Meme-related endpoints
  getMeme: (id) => `${API_BASE_URL}/memes/${id}`,
  vote: (id) => `${API_BASE_URL}/memes/${id}/vote`,
  topMemes: `${API_BASE_URL}/memes/top`,
  memesByCompany: (company) => `${API_BASE_URL}/memes?company=${encodeURIComponent(company)}`,
  
  // Comment-related endpoints
  getComments: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  addComment: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  
  // Auth-related endpoints
  googleAuth: `${API_BASE_URL}/users/google-auth`,
  updateNickname: `${API_BASE_URL}/users/update-nickname`,
  userUpvotes: (userId) => `${API_BASE_URL}/users/${userId}/upvoted`
}; 