import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, CLIENT_BASE_URL } from '../utils/config';

const AuthContext = createContext();

// Client ID for Google OAuth from environment variable
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Local storage key constants
const STORAGE_KEYS = {
  USER: 'memeUser',
  UPVOTED_MEMES: 'upvotedMemes',
  PERMISSIONS: 'userPermissions'
};

// Helper function to safely parse from localStorage
const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Helper function to safely save to localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [upvotedMemes, setUpvotedMemes] = useState([]);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userPermissions, setUserPermissions] = useState({
    isAdmin: false,
    isModerator: false,
    permissions: {
      canCreateMemes: false,
      canDeleteMemes: false,
      canEditMemes: false,
      canManageUsers: false,
      canManageRoles: false
    }
  });

  // Load user data on mount
  useEffect(() => {
    const initialize = () => {
      const savedUser = getFromLocalStorage(STORAGE_KEYS.USER);
      if (savedUser) {
        setCurrentUser(savedUser);
        
        // Load upvoted memes
        const savedUpvotes = getFromLocalStorage(STORAGE_KEYS.UPVOTED_MEMES, []);
        setUpvotedMemes(savedUpvotes);
        
        // Load saved permissions
        const savedPermissions = getFromLocalStorage(STORAGE_KEYS.PERMISSIONS);
        if (savedPermissions) {
          setUserPermissions(savedPermissions);
        }
        
        // Fetch latest permissions
        fetchUserPermissions(savedUser.uid);
      }
      setLoading(false);
    };

    // Initialize auth state
    initialize();
    
    // Load Google Sign-In API
    loadGoogleScript();
  }, []);

  // Load Google Sign-In JS SDK
  const loadGoogleScript = useCallback(() => {
    // Don't load if script already exists
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return;
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => console.log('Google Sign-In SDK loaded successfully');
    script.onerror = () => console.error('Failed to load Google Sign-In SDK');
    document.body.appendChild(script);
  }, []);

  // Track upvoted memes - returns true if added, false if already upvoted or user not logged in
  const addUpvotedMeme = useCallback((memeId) => {
    if (!currentUser || !memeId) return false;
    
    // Normalize memeId to number if possible
    const normalizedId = !isNaN(memeId) ? Number(memeId) : memeId;
    
    // Don't add if already upvoted
    if (upvotedMemes.some(id => id === normalizedId || id === memeId)) return false;
    
    const newUpvotedMemes = [...upvotedMemes, normalizedId];
    setUpvotedMemes(newUpvotedMemes);
    saveToLocalStorage(STORAGE_KEYS.UPVOTED_MEMES, newUpvotedMemes);
    return true;
  }, [currentUser, upvotedMemes]);
  
  // Remove upvoted meme - returns true if removed, false if not upvoted or user not logged in
  const removeUpvotedMeme = useCallback((memeId) => {
    if (!currentUser || !memeId) return false;
    
    // Normalize memeId for comparison
    const normalizedId = !isNaN(memeId) ? Number(memeId) : memeId;
    
    // Check if upvoted
    if (!upvotedMemes.some(id => id === normalizedId || id === memeId)) return false;
    
    // Filter out both string and number versions of the ID
    const newUpvotedMemes = upvotedMemes.filter(id => 
      id !== normalizedId && id !== memeId
    );
    
    setUpvotedMemes(newUpvotedMemes);
    saveToLocalStorage(STORAGE_KEYS.UPVOTED_MEMES, newUpvotedMemes);
    return true;
  }, [currentUser, upvotedMemes]);
  
  // Check if user has upvoted a meme
  const hasUpvoted = useCallback((memeId) => {
    if (!memeId) return false;
    
    // Normalize memeId for comparison
    const normalizedId = !isNaN(memeId) ? Number(memeId) : memeId;
    
    return upvotedMemes.some(id => 
      id === normalizedId || id === memeId
    );
  }, [upvotedMemes]);

  // Fetch the latest user permissions
  const fetchUserPermissions = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.users}/me?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching user permissions: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update permissions state
      const permissions = {
        isAdmin: data.isAdmin || false,
        isModerator: data.isModerator || false,
        permissions: data.permissions || {
          canCreateMemes: true,
          canDeleteMemes: false,
          canEditMemes: false,
          canManageUsers: false,
          canManageRoles: false
        }
      };
      
      setUserPermissions(permissions);
      saveToLocalStorage(STORAGE_KEYS.PERMISSIONS, permissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  }, []);

  // Google login logic
  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    
    if (!window.google) {
      console.error('Google Sign-In SDK not loaded');
      setAuthError('Google Sign-In is not available. Please try again later.');
      return;
    }

    try {
      // Create the Google Identity Services client
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google Sign-In error:', tokenResponse);
            setAuthError('Error signing in with Google. Please try again.');
            return;
          }

          try {
            // Get user info using the access token
            const userInfoResponse = await fetch(
              'https://www.googleapis.com/oauth2/v3/userinfo',
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              }
            );
            
            if (!userInfoResponse.ok) {
              throw new Error('Failed to get user info from Google');
            }
            
            const googleUserInfo = await userInfoResponse.json();
            
            // Create user data object from Google response
            const googleUserData = {
              googleId: googleUserInfo.sub,
              displayName: googleUserInfo.name,
              email: googleUserInfo.email,
              photoURL: googleUserInfo.picture,
              token: tokenResponse.access_token
            };
            
            // Send Google data to our server for JWT and account creation/verification
            const serverLoginResponse = await fetch(`${API_ENDPOINTS.auth}/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(googleUserData)
            });
            
            if (!serverLoginResponse.ok) {
              throw new Error(`Server login failed: ${serverLoginResponse.status}`);
            }
            
            const authData = await serverLoginResponse.json();
            
            if (authData.error) {
              setAuthError(authData.error);
              return;
            }
            
            // Store the JWT token for API requests
            localStorage.setItem('token', authData.token);
            
            // Create a unified user object from Google and our database
            const user = {
              ...googleUserData,
              uid: authData.userId || googleUserInfo.sub,
              username: authData.username || googleUserInfo.name,
              isEmailVerified: authData.isEmailVerified || false,
              emailVerificationRequired: authData.emailVerificationRequired || false
            };
            
            // Set verification needed state
            setNeedsVerification(
              authData.emailVerificationRequired && !authData.isEmailVerified
            );
            
            // Save user to state and localStorage
            setCurrentUser(user);
            saveToLocalStorage(STORAGE_KEYS.USER, user);
            
            // Load any upvoted memes from the server
            if (authData.upvotedMemes && Array.isArray(authData.upvotedMemes)) {
              setUpvotedMemes(authData.upvotedMemes);
              saveToLocalStorage(STORAGE_KEYS.UPVOTED_MEMES, authData.upvotedMemes);
            }
            
            // Fetch user permissions
            fetchUserPermissions(user.uid);
          } catch (error) {
            console.error('Error processing Google login:', error);
            setAuthError('Error processing login. Please try again.');
          }
        }
      });
      
      // Prompt user for Google Sign-In
      client.requestAccessToken();
    } catch (error) {
      console.error('Google login error:', error);
      setAuthError('Failed to initialize Google Sign-In. Please try again later.');
    }
  }, [fetchUserPermissions]);

  // Logout function
  const logout = useCallback(() => {
    // Clear user data from state
    setCurrentUser(null);
    setUpvotedMemes([]);
    setUserPermissions({
      isAdmin: false,
      isModerator: false,
      permissions: {
        canCreateMemes: false,
        canDeleteMemes: false,
        canEditMemes: false,
        canManageUsers: false,
        canManageRoles: false
      }
    });
    
    // Clear localStorage data
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.UPVOTED_MEMES);
    localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
    localStorage.removeItem('token');
    
    // Attempt to revoke Google token if available
    if (window.google && currentUser?.token) {
      try {
        window.google.accounts.oauth2.revoke(currentUser.token);
      } catch (error) {
        console.error('Error revoking Google token:', error);
      }
    }
  }, [currentUser]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    if (userPermissions.isAdmin) return true;
    
    if (permission === 'moderation' && userPermissions.isModerator) return true;
    
    return userPermissions.permissions && 
           userPermissions.permissions[permission] === true;
  }, [userPermissions]);

  // Resend verification email
  const resendVerificationEmail = useCallback(async () => {
    if (!currentUser || !currentUser.email) {
      setAuthError('User not logged in or no email available');
      return false;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.auth}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error resending verification email:', error);
      setAuthError(error.message || 'Failed to resend verification email');
      return false;
    }
  }, [currentUser]);
  
  const value = {
    currentUser,
    loading,
    authError,
    needsVerification,
    isAdmin: userPermissions.isAdmin,
    isModerator: userPermissions.isModerator,
    hasUpvoted,
    addUpvotedMeme,
    removeUpvotedMeme,
    loginWithGoogle,
    logout,
    hasPermission,
    resendVerificationEmail,
    // Derived properties
    isLoggedIn: !!currentUser,
    isVerified: currentUser?.isEmailVerified || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 