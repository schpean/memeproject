import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/api';
import './LoginButton.css';

const LoginButton = () => {
  const { currentUser, loginWithGoogle, logout, authError } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState(null);
  const [isChangingNickname, setIsChangingNickname] = useState(false);
  const modalRef = useRef(null);
  const prevUserRef = useRef(null);

  // Default mascot image to use if the server one fails
  const defaultMascot = '/images/mascot_default.png';

  // Function to get displayable username
  const getDisplayName = () => {
    if (!currentUser) return 'User';
    return currentUser.username || 'User';
  };

  // Function to determine if nickname change should be shown
  const shouldShowNicknameChange = () => {
    if (!currentUser) return false;
    
    const hasChangedNickname = currentUser.nickname_changed === true;
    console.log('Should show nickname change?', !hasChangedNickname);
    return !hasChangedNickname;
  };

  // Handler for image loading errors - use default mascot if server image fails
  const handleImageError = (e) => {
    e.target.src = defaultMascot;
  };

  // Make sure we have the most up-to-date user data
  useEffect(() => {
    if (currentUser) {
      // Check if we need to update from localStorage
      const storedUserStr = localStorage.getItem('memeUser');
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          
          // If the stored user has nickname_changed=true but our current user doesn't,
          // we need to update our state
          if (storedUser.nickname_changed && !currentUser.nickname_changed) {
            console.log('Updating currentUser with nickname_changed from localStorage');
            // We'll rely on the refresh after nickname change to update the UI
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
        }
      }
    }
  }, [currentUser]);

  // Update login error when authError changes
  useEffect(() => {
    if (authError) {
      setLoginError(authError);
      setIsLoggingIn(false);
    }
  }, [authError]);

  // Store previous user state for comparison
  useEffect(() => {
    prevUserRef.current = currentUser;
  }, [currentUser]);

  const handleLogin = async (provider) => {
    try {
      setLoginError(null);
      setIsLoggingIn(true);
      
      if (provider === 'google') {
        await loginWithGoogle();
        // The callback in AuthContext will handle setting the user
      }
      
      // Don't close modal immediately - wait for the callback to complete
    } catch (error) {
      console.error(`${provider} login failed:`, error);
      setLoginError('Login failed. Please try again.');
      setIsLoggingIn(false);
    }
  };

  // Close modal when user is logged in (comparing with previous state)
  useEffect(() => {
    const wasLoggedOut = !prevUserRef.current;
    const isNowLoggedIn = currentUser;
    
    if (wasLoggedOut && isNowLoggedIn) {
      setShowModal(false);
      setIsLoggingIn(false);
    }
  }, [currentUser]);

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Logging out user");
    logout();
    setShowModal(false);
  };

  const openModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoginError(null);
    setNicknameError(null);
    
    if (currentUser) {
      console.log('Current user:', currentUser);
      console.log('Nickname has been changed:', currentUser.nickname_changed);
    }
    
    setShowModal(true);
  };

  const closeModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowModal(false);
    setNewNickname('');
    setNicknameError(null);
  };

  const handleChangeNickname = async (e) => {
    e.preventDefault();
    
    // First check if user has already changed their nickname
    if (currentUser && currentUser.nickname_changed) {
      setNicknameError('You have already changed your nickname once');
      return;
    }
    
    // Validate nickname
    if (!newNickname || newNickname.length < 3 || newNickname.length > 30) {
      setNicknameError('Nickname must be between 3 and 30 characters');
      return;
    }
    
    setNicknameError(null);
    setIsChangingNickname(true);
    
    try {
      console.log('Attempting to update nickname to:', newNickname);
      console.log('Current user:', currentUser);
      
      // Check if we have a valid user
      if (!currentUser || !currentUser.uid) {
        throw new Error('User is not properly logged in. Please log out and back in.');
      }
      
      // Check if the API endpoint is working
      console.log('Using API endpoint:', api && api.userApi ? 'Available' : 'Not available');
      
      // Ensure userApi is available
      if (!api || !api.userApi) {
        throw new Error('API not properly initialized');
      }
      
      const result = await api.userApi.updateNickname(newNickname);
      console.log('Nickname update successful:', result);
      
      // Update UI with success message
      alert('Nickname updated successfully!');
      
      // The API call updates the user in localStorage
      window.location.reload(); // Refresh to update UI with new nickname
    } catch (error) {
      console.error('Error changing nickname:', error);
      
      // Check for specific nickname already changed error
      if (error.message && error.message.includes('can only change your nickname once')) {
        setNicknameError('You have already changed your nickname once');
        
        // Update local user object to reflect this
        if (currentUser && !currentUser.nickname_changed) {
          const updatedUser = {
            ...currentUser,
            nickname_changed: true
          };
          localStorage.setItem('memeUser', JSON.stringify(updatedUser));
          
          // Refresh to update UI
          window.location.reload();
        }
        return;
      }
      
      // Detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response error:', {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        });
        
        if (error.response.data && error.response.data.error) {
          setNicknameError(error.response.data.error);
        } else {
          setNicknameError(`Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setNicknameError('Server did not respond. Please try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        setNicknameError(error.message || 'Failed to send request. Please try again.');
      }
    } finally {
      setIsChangingNickname(false);
    }
  };

  // Handle clicks outside the modal or dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (currentUser) {
        // For dropdown, close when clicking outside
        const dropdown = document.querySelector('.user-dropdown');
        const userProfile = document.querySelector('.user-profile');
        
        if (dropdown && !dropdown.contains(event.target) && !userProfile.contains(event.target)) {
          setShowModal(false);
        }
      } else if (modalRef.current && !modalRef.current.contains(event.target)) {
        // For login modal, only close if clicking the overlay
        const isOverlayClick = event.target.classList.contains('auth-modal-overlay');
        if (isOverlayClick) {
          setShowModal(false);
        }
      }
    }

    // Add event listener only if modal is shown
    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal, currentUser]);

  return (
    <div className="login-container">
      {currentUser ? (
        <div className="user-profile" onClick={openModal}>
          <img 
            src={currentUser.photoURL || defaultMascot} 
            alt={currentUser.username || 'User'} 
            className="user-avatar"
            onError={handleImageError}
          />
          <span className="user-name">{getDisplayName()}</span>
        </div>
      ) : (
        <button className="login-button" onClick={openModal}>
          Log In
        </button>
      )}

      {showModal && currentUser && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <h3>User Options</h3>
            <button className="close-button" onClick={closeModal} aria-label="Close">×</button>
          </div>
          
          <div className="user-dropdown-content">
            <div className="user-info">
              <div className="user-profile-large">
                <img 
                  src={currentUser.photoURL || defaultMascot} 
                  alt={currentUser.username || 'User'} 
                  className="user-avatar-large"
                  onError={handleImageError}
                />
                <div className="user-details">
                  <p className="user-displayname">{getDisplayName()}</p>
                  <p className="user-username">@{getDisplayName()}</p>
                  <p className="user-email">User at bossme.me</p>
                </div>
              </div>
              
              {shouldShowNicknameChange() && (
                <div className="nickname-change-section">
                  <h4>Change Your Nickname</h4>
                  <p className="nickname-info">You can change your nickname once.</p>
                  
                  <form onSubmit={handleChangeNickname}>
                    <input
                      type="text"
                      placeholder="New nickname"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="nickname-input"
                      disabled={isChangingNickname}
                    />
                    
                    {nicknameError && (
                      <p className="nickname-error">{nicknameError}</p>
                    )}
                    
                    <button 
                      type="submit" 
                      className="change-nickname-button"
                      disabled={isChangingNickname}
                    >
                      {isChangingNickname ? 'Updating...' : 'Update Nickname'}
                    </button>
                  </form>
                </div>
              )}
              
              <button className="logout-button" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && !currentUser && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <div className="auth-modal-header">
              <h3>Log in</h3>
              <button className="close-button" onClick={closeModal} aria-label="Close">×</button>
            </div>
            
            <div className="auth-modal-content">
              <div className="login-options">
                <p className="login-text">Continue with your account:</p>
                <button 
                  className="google-login-button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    handleLogin('google'); 
                  }}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Signing in...' : (
                    <>
                      <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                          <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                          <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                          <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                          <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                        </g>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
                
                {loginError && (
                  <div className="login-error">
                    <p>{loginError}</p>
                  </div>
                )}
                
                <div className="coming-soon">
                  <p>More login options coming soon!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginButton; 