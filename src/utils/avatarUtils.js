/**
 * Avatar utilities using Dicebear API
 */

/**
 * Generate a Dicebear avatar URL based on the username
 * @param {string} username - The username to generate an avatar for
 * @param {string} style - The Dicebear style to use (default: fun-emoji)
 * @returns {string} The avatar URL
 */
export const getDicebearAvatarUrl = (username, style = 'fun-emoji') => {
  // Use consistent seed based on username
  const seed = username || 'anonymous';
  
  // Create URL with options
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};

/**
 * Get avatar URL with fallback to default
 * @param {string} username - Username for avatar generation
 * @param {string} existingUrl - Existing avatar URL if present
 * @returns {string} The avatar URL to use
 */
export const getAvatarUrl = (username, existingUrl = null) => {
  // If there's an existing URL that starts with http(s), use it (might be from Google)
  if (existingUrl && (existingUrl.startsWith('http://') || existingUrl.startsWith('https://'))) {
    return existingUrl;
  }
  
  // Generate a Dicebear avatar for this user
  return getDicebearAvatarUrl(username);
}; 