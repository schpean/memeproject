import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, CLIENT_BASE_URL } from '../utils/config';

const AuthContext = createContext();

// Client ID pentru OAuth din variabilele de mediu
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.REACT_APP_APPLE_CLIENT_ID;

// Constantele pentru providerii de autentificare
const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  APPLE: 'apple',
  EMAIL: 'email'
};

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
  const [globalLoading, setGlobalLoading] = useState(false);
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

  // Funcție pentru a activa loading global
  const startGlobalLoading = useCallback(() => {
    setGlobalLoading(true);
  }, []);

  // Funcție pentru a dezactiva loading global
  const stopGlobalLoading = useCallback(() => {
    setGlobalLoading(false);
  }, []);

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
        fetchUserPermissions(savedUser.uid, savedUser.authProvider);
      }
      setLoading(false);
    };

    // Initialize auth state
    initialize();
    
    // Load auth provider scripts
    loadAuthScripts();
  }, []);

  // Load auth provider JS SDKs
  const loadAuthScripts = useCallback(() => {
    // Load Google Sign-In API if not already loaded
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => console.log('Google Sign-In SDK loaded successfully');
      script.onerror = () => console.error('Failed to load Google Sign-In SDK');
      document.body.appendChild(script);
    }
    
    // Aici putem adăuga alte script-uri pentru alți provideri (Apple, etc.)
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
  const fetchUserPermissions = useCallback(async (userId, authProvider = AUTH_PROVIDERS.GOOGLE) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.users}/me?userId=${userId}&authProvider=${authProvider}`);
      
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
    
    // Logout din provider specific
    if (currentUser?.authProvider && currentUser?.token) {
      try {
        switch(currentUser.authProvider) {
          case AUTH_PROVIDERS.GOOGLE:
            if (window.google) {
              window.google.accounts.oauth2.revoke(currentUser.token);
            }
            break;
          case AUTH_PROVIDERS.APPLE:
            // Aici va fi logica pentru revocarea token-ului Apple
            console.log('Apple logout not implemented yet');
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error revoking ${currentUser.authProvider} token:`, error);
      }
    }
  }, [currentUser]);

  // Funcție abstractizată pentru a procesa rezultatele autentificării
  const processAuthResult = useCallback(async (providerData, authProvider) => {
    try {
      // Construiește endpoint-ul corect pentru provider
      const endpoint = authProvider === AUTH_PROVIDERS.GOOGLE 
        ? API_ENDPOINTS.googleAuth 
        : authProvider === AUTH_PROVIDERS.APPLE 
          ? API_ENDPOINTS.appleAuth 
          : API_ENDPOINTS.emailAuth;
      
      // Prepare the data based on the provider type
      let requestData = { ...providerData, authProvider };
      
      // Specific provider keys required by the backend
      if (authProvider === AUTH_PROVIDERS.GOOGLE) {
        requestData.googleId = providerData.providerUserId;
      } else if (authProvider === AUTH_PROVIDERS.APPLE) {
        requestData.appleId = providerData.providerUserId;
      }
      
      // Send provider data to our server for JWT and account creation/verification
      const serverLoginResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      // Parse response JSON indiferent de codul de răspuns pentru a vedea mesajul de eroare
      const responseData = await serverLoginResponse.json();
      
      if (!serverLoginResponse.ok) {
        // Verifică dacă serverul a returnat un mesaj de eroare specific
        if (responseData.message) {
          setAuthError(responseData.message);
        } else if (responseData.error && responseData.error.includes('previously associated with a deleted account')) {
          setAuthError('Această adresă de email nu poate fi folosită pentru că a fost asociată anterior cu un cont șters.');
        } else if (responseData.error && responseData.error.includes('Account deactivated')) {
          setAuthError('Contul tău a fost dezactivat. Te rugăm să contactezi administratorul pentru asistență.');
        } else {
          setAuthError(`Eroare de autentificare: ${responseData.error || 'Necunoscută'}`);
        }
        
        logout(); // Deconectează utilizatorul în caz de eroare
        return null;
      }
      
      if (responseData.error) {
        setAuthError(responseData.error);
        return null;
      }
      
      // Store the JWT token for API requests
      localStorage.setItem('token', responseData.token);
      
      // Create a unified user object
      const user = {
        ...providerData,
        uid: responseData.userId || providerData.providerUserId,
        username: responseData.username || providerData.displayName,
        isEmailVerified: responseData.isEmailVerified || false,
        emailVerificationRequired: responseData.emailVerificationRequired || false,
        authProvider,
        authProviderId: providerData.providerUserId
      };
      
      // Set verification needed state
      setNeedsVerification(
        responseData.emailVerificationRequired && !responseData.isEmailVerified
      );
      
      // Save user to state and localStorage
      setCurrentUser(user);
      saveToLocalStorage(STORAGE_KEYS.USER, user);
      
      // Load any upvoted memes from the server
      if (responseData.upvotedMemes && Array.isArray(responseData.upvotedMemes)) {
        setUpvotedMemes(responseData.upvotedMemes);
        saveToLocalStorage(STORAGE_KEYS.UPVOTED_MEMES, responseData.upvotedMemes);
      }
      
      // Fetch user permissions
      fetchUserPermissions(user.uid, authProvider);
      
      return user;
    } catch (error) {
      console.error('Error processing authentication:', error);
      
      // Verifică dacă eroarea conține detalii despre un cont șters
      if (error.response && error.response.data && 
          error.response.data.redirectToLogin) {
        setAuthError('Contul tău a fost dezactivat. Te rugăm să contactezi administratorul pentru asistență.');
        logout(); // Deconectează utilizatorul și curăță starea locală
        return null;
      }
      
      setAuthError('Error processing login. Please try again.');
      return null;
    }
  }, [fetchUserPermissions, logout]);

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
              providerUserId: googleUserInfo.sub,
              displayName: googleUserInfo.name,
              email: googleUserInfo.email,
              photoURL: googleUserInfo.picture,
              token: tokenResponse.access_token
            };
            
            // Process Google authentication
            await processAuthResult(googleUserData, AUTH_PROVIDERS.GOOGLE);
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
  }, [processAuthResult]);

  // Apple login logic - pregătit pentru implementare viitoare
  const loginWithApple = useCallback(async () => {
    setAuthError(null);
    
    // Aici se va implementa logica pentru autentificare Apple
    setAuthError('Apple Sign-In is not implemented yet.');
    
    // Exemplu: 
    // const appleUserData = {
    //   providerUserId: 'apple-user-id',
    //   displayName: 'Apple User',
    //   email: 'user@apple.com',
    //   photoURL: '',
    //   token: 'apple-token'
    // };
    // 
    // await processAuthResult(appleUserData, AUTH_PROVIDERS.APPLE);
  }, []);

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
          email: currentUser.email,
          authProvider: currentUser.authProvider || AUTH_PROVIDERS.GOOGLE
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
    loginWithApple,
    logout,
    hasPermission,
    resendVerificationEmail,
    // Derived properties
    isLoggedIn: !!currentUser,
    isVerified: currentUser?.isEmailVerified || false,
    globalLoading,
    startGlobalLoading,
    stopGlobalLoading,
    // Constants
    AUTH_PROVIDERS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 