// Configuration settings for the application
export const API_BASE_URL = 'http://localhost:1337';
export const CLIENT_BASE_URL = 'http://localhost:1338';
export const API_ENDPOINTS = {
  memes: `${API_BASE_URL}/memes`,
  vote: (id) => `${API_BASE_URL}/memes/${id}/vote`,
  topMemes: `${API_BASE_URL}/memes/top`,
  memesByCompany: (company) => `${API_BASE_URL}/memes?company=${encodeURIComponent(company)}`,
  googleAuth: `${API_BASE_URL}/users/google-auth`,
  // New comment endpoints
  getComments: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  addComment: (memeId) => `${API_BASE_URL}/memes/${memeId}/comments`,
  // Single meme endpoint
  getMeme: (id) => `${API_BASE_URL}/memes/${id}`,
}; 