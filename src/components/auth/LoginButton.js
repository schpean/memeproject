import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './LoginButton.css';
import { FaSignInAlt, FaSignOutAlt, FaUser, FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { getAvatarUrl } from '../../utils/avatarUtils';

const LoginButton = ({ className = '', hideUsername = false }) => {
  const { currentUser, loginWithGoogle, loginWithApple, logout, needsVerification, resendVerificationEmail, AUTH_PROVIDERS } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };
  
  const handleLoginClick = () => {
    setShowLoginOptions(!showLoginOptions);
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
    setShowLoginOptions(false);
  };
  
  const handleAppleLogin = () => {
    loginWithApple();
    setShowLoginOptions(false);
  };

  const handleVerification = () => {
    resendVerificationEmail();
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // User is not logged in
  if (!currentUser) {
    return (
      <div className="auth-container">
        <button 
          className={`auth-button login-button ${className}`}
          onClick={handleLoginClick}
        >
          <FaSignInAlt className="auth-icon" />
          <span>Log In</span>
        </button>
        
        {showLoginOptions && (
          <div className="login-options-dropdown">
            <button 
              className="login-option google-login"
              onClick={handleGoogleLogin}
            >
              <FcGoogle className="provider-icon" />
              <span>Continue with Google</span>
            </button>
            <button 
              className="login-option apple-login"
              onClick={handleAppleLogin}
              disabled={true}
            >
              <FaApple className="provider-icon" />
              <span>Continue with Apple</span>
              <small className="coming-soon">(Coming soon)</small>
            </button>
          </div>
        )}
      </div>
    );
  }

  // User is logged in
  return (
    <div className="user-menu-container">
      {!hideUsername ? (
        <div className="user-profile" onClick={toggleMenu}>
          <img src={getAvatarUrl(currentUser.username, currentUser.photoURL)} alt={currentUser.displayName} className="user-avatar" />
          <span className="user-name">{currentUser.displayName}</span>
          {currentUser.authProvider && (
            <small className="auth-provider-badge">
              {currentUser.authProvider === AUTH_PROVIDERS.GOOGLE && <FcGoogle />}
              {currentUser.authProvider === AUTH_PROVIDERS.APPLE && <FaApple />}
            </small>
          )}
        </div>
      ) : (
        // If hideUsername is true, just show the logout button with text
        <button onClick={handleLogout} className={`dropdown-item ${className}`}>
          <FaSignOutAlt className="auth-icon" />
          <span>Log Out</span>
        </button>
      )}

      {!hideUsername && isMenuOpen && (
        <div className="user-dropdown">
          {needsVerification && (
            <div className="verification-alert">
              <p>Please verify your email</p>
              <div className="verification-buttons">
                <Link to="/verify-email" className="dropdown-item verification-link">
                  Verify Now
                </Link>
                <button onClick={handleVerification} className="dropdown-item resend-link">
                  Resend Email
                </button>
              </div>
            </div>
          )}
          
          <button onClick={handleLogout} className="dropdown-item">
            <FaSignOutAlt className="auth-icon" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginButton;