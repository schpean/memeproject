import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_ENDPOINTS, CLIENT_BASE_URL } from '../utils/config';

const AuthContext = createContext();

// Client ID for Google OAuth from environment variable
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [upvotedMemes, setUpvotedMemes] = useState([]);
  // Add verification state
  const [needsVerification, setNeedsVerification] = useState(false);
  // Add new state for role-based permissions
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

  // Check if user is logged in on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('memeUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        
        // Load upvoted memes
        const savedUpvotes = localStorage.getItem('upvotedMemes');
        if (savedUpvotes) {
          setUpvotedMemes(JSON.parse(savedUpvotes));
        }
        
        // Load saved permissions or fetch fresh ones
        const savedPermissions = localStorage.getItem('userPermissions');
        if (savedPermissions) {
          setUserPermissions(JSON.parse(savedPermissions));
        }
        
        // Fetch latest permissions
        fetchUserPermissions(parsedUser.uid);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('memeUser');
        localStorage.removeItem('upvotedMemes');
        localStorage.removeItem('userPermissions');
      }
    }
    setLoading(false);

    // Load the Google Sign-In API
    loadGoogleScript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load Google Sign-In JS SDK
  const loadGoogleScript = () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    script.onerror = () => console.error('Failed to load Google Sign-In SDK');
    document.body.appendChild(script);
  };

  // Initialize Google Sign-In
  const initializeGoogleSignIn = () => {
    if (!window.google) return;
    try {
      console.log('Google Sign-In SDK loaded successfully');
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
    }
  };

  // Track upvoted memes
  const addUpvotedMeme = (memeId) => {
    if (!currentUser) return false;
    
    // Don't add if already upvoted
    if (upvotedMemes.includes(memeId)) return false;
    
    const newUpvotedMemes = [...upvotedMemes, memeId];
    setUpvotedMemes(newUpvotedMemes);
    localStorage.setItem('upvotedMemes', JSON.stringify(newUpvotedMemes));
    return true;
  };
  
  // Remove upvoted meme (for un-upvoting)
  const removeUpvotedMeme = (memeId) => {
    if (!currentUser) return false;
    
    if (!upvotedMemes.includes(memeId)) return false;
    
    const newUpvotedMemes = upvotedMemes.filter(id => id !== memeId);
    setUpvotedMemes(newUpvotedMemes);
    localStorage.setItem('upvotedMemes', JSON.stringify(newUpvotedMemes));
    return true;
  };
  
  // Check if user has upvoted a meme
  const hasUpvoted = (memeId) => {
    return upvotedMemes.includes(memeId);
  };

  // Fetch the latest user permissions
  const fetchUserPermissions = async (userId) => {
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
      
      // Save permissions to localStorage
      localStorage.setItem('userPermissions', JSON.stringify(permissions));
      
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  // Google login logic
  const loginWithGoogle = async () => {
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
            
            // Send the Google user data to your server
            console.log(`Sending auth data from ${CLIENT_BASE_URL} to ${API_ENDPOINTS.googleAuth}`);
            const response = await fetch(API_ENDPOINTS.googleAuth, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Origin': CLIENT_BASE_URL
              },
              credentials: 'include', // Include cookies for authentication
              body: JSON.stringify(googleUserData),
            });
            
            // Check if response is OK and the content type is JSON
            const contentType = response.headers.get('content-type');
            if (!response.ok) {
              // Try to read response as text first to debug
              const errorText = await response.text();
              console.error('Server error response:', errorText);
              throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            if (!contentType || !contentType.includes('application/json')) {
              console.error('Server did not return JSON:', contentType);
              throw new Error('Server response was not JSON');
            }
            
            // Now parse the JSON response
            const userData = await response.json();
            
            // Create the full user object with data from both Google and your server
            const user = {
              uid: userData.id,
              googleId: userData.google_id,
              // Don't store email in the user object for privacy
              displayName: userData.username, // Use username instead of real name
              username: userData.username,
              photoURL: userData.photo_url, // Will be mascot image from server
              nickname_changed: userData.nickname_changed || false,
              isAdmin: userData.isAdmin || false,
              isModerator: userData.isModerator || false,
              provider: 'google'
            };
            
            setCurrentUser(user);
            localStorage.setItem('memeUser', JSON.stringify(user));
            
            // Check if user needs to verify email
            if (userData.needsVerification) {
              setNeedsVerification(true);
              // Show generic verification message without mentioning specific email
              window.alert('Account created successfully! Please verify your email to access all features.');
            }
            
            // Set permissions based on the response
            if (userData.permissions) {
              const permissions = {
                isAdmin: userData.isAdmin || false,
                isModerator: userData.isModerator || false,
                permissions: userData.permissions
              };
              
              setUserPermissions(permissions);
              localStorage.setItem('userPermissions', JSON.stringify(permissions));
            } else {
              // Fetch permissions if not included in the response
              fetchUserPermissions(user.uid);
            }
            
            // Try to fetch upvoted memes from server
            try {
              // Placeholder for API call to get user's upvoted memes
              // const upvotedResponse = await fetch(API_ENDPOINTS.userUpvotes(user.uid));
              // if (upvotedResponse.ok) {
              //   const upvotedData = await upvotedResponse.json();
              //   setUpvotedMemes(upvotedData.memes);
              //   localStorage.setItem('upvotedMemes', JSON.stringify(upvotedData.memes));
              // }
            } catch (err) {
              console.error('Error fetching upvoted memes:', err);
              // Non-critical, don't affect login flow
            }
          } catch (error) {
            console.error('Error handling Google sign-in:', error);
            setAuthError(error.message || 'Error signing in. Please try again.');
          }
        },
      });
      
      // Prompt for consent
      client.requestAccessToken();
    } catch (error) {
      console.error('Google login failed:', error);
      setAuthError('Failed to initialize Google Sign-In. Please try again.');
      throw error;
    }
  };

  const logout = () => {
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
    localStorage.removeItem('memeUser');
    localStorage.removeItem('upvotedMemes');
    localStorage.removeItem('userPermissions');
  };
  
  // Helper function to check if user has a specific permission
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    
    // Admin has all permissions
    if (userPermissions.isAdmin) return true;
    
    // Check specific permission
    return userPermissions.permissions && userPermissions.permissions[permission] === true;
  };

  // Add resend verification email function
  const resendVerificationEmail = async () => {
    if (!currentUser || !currentUser.uid) {
      setAuthError('User not logged in');
      return false;
    }
    
    try {
      // Send only the user ID instead of email
      const response = await fetch(`${API_ENDPOINTS.base}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.uid }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }
      
      const result = await response.json();
      window.alert('Verification email has been sent. Please check your inbox.');
      return true;
    } catch (error) {
      console.error('Error resending verification email:', error);
      setAuthError('Failed to resend verification email. Please try again.');
      return false;
    }
  };

  const value = {
    currentUser,
    loading,
    authError,
    upvotedMemes,
    hasUpvoted,
    addUpvotedMeme,
    removeUpvotedMeme,
    loginWithGoogle,
    logout,
    // Add new role-based props
    isAdmin: userPermissions.isAdmin,
    isModerator: userPermissions.isModerator,
    permissions: userPermissions.permissions,
    hasPermission,
    needsVerification,
    resendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 