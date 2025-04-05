import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_ENDPOINTS, CLIENT_BASE_URL } from '../utils/config';

const AuthContext = createContext();

// Client ID for Google OAuth
const GOOGLE_CLIENT_ID = '863081687369-outsbcfj82tusibab06nc717kudre0n1.apps.googleusercontent.com';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [upvotedMemes, setUpvotedMemes] = useState([]);

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
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('memeUser');
        localStorage.removeItem('upvotedMemes');
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
  
  // Check if user has upvoted a meme
  const hasUpvoted = (memeId) => {
    return upvotedMemes.includes(memeId);
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
              credentials: 'include', // Include cookies if you need them
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
              email: userData.email,
              displayName: userData.display_name,
              username: userData.username,
              photoURL: userData.photo_url,
              provider: 'google'
            };
            
            setCurrentUser(user);
            localStorage.setItem('memeUser', JSON.stringify(user));
            
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
    localStorage.removeItem('memeUser');
    localStorage.removeItem('upvotedMemes');
    // We don't need to manually revoke the token with the new approach
  };

  const value = {
    currentUser,
    loading,
    authError,
    upvotedMemes,
    hasUpvoted,
    addUpvotedMeme,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 