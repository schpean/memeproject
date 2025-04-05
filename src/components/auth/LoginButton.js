import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginButton.css';

const LoginButton = () => {
  const { currentUser, loginWithGoogle, logout, authError } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const modalRef = useRef(null);
  const prevUserRef = useRef(null);

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
    setShowModal(true);
  };

  const closeModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowModal(false);
  };

  // Handle clicks outside the modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Only close if clicking the overlay (not inside the modal)
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
  }, [showModal]);

  return (
    <div className="login-container">
      {currentUser ? (
        <div className="user-profile" onClick={openModal}>
          <img 
            src={currentUser.photoURL || 'https://via.placeholder.com/32'} 
            alt={currentUser.displayName} 
            className="user-avatar" 
          />
          <span className="user-name">{currentUser.username || currentUser.displayName}</span>
        </div>
      ) : (
        <button className="login-button" onClick={openModal}>
          Log In
        </button>
      )}

      {showModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal" ref={modalRef}>
            <div className="auth-modal-header">
              <h3>{currentUser ? 'User Options' : 'Log in'}</h3>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            
            <div className="auth-modal-content">
              {currentUser ? (
                <div className="user-info">
                  <div className="user-profile-large">
                    <img 
                      src={currentUser.photoURL || 'https://via.placeholder.com/64'} 
                      alt={currentUser.displayName} 
                      className="user-avatar-large" 
                    />
                    <div className="user-details">
                      <p className="user-displayname">{currentUser.displayName}</p>
                      <p className="user-username">@{currentUser.username}</p>
                      <p className="user-email">{currentUser.email}</p>
                    </div>
                  </div>
                  <button className="logout-button" onClick={handleLogout}>
                    Log Out
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginButton; 