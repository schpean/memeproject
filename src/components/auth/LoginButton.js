import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './LoginButton.css';
import { FaSignInAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { getAvatarUrl } from '../../utils/avatarUtils';

const LoginButton = ({ className = '', hideUsername = false }) => {
  const { currentUser, loginWithGoogle, logout, needsVerification, resendVerificationEmail } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAuth = () => {
    if (currentUser) {
      logout();
    } else {
      loginWithGoogle();
    }
  };

  const handleVerification = () => {
    resendVerificationEmail();
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!currentUser) {
    return (
      <button 
        className={`auth-button login-button ${className}`}
        onClick={handleAuth}
      >
        <FaSignInAlt className="auth-icon" />
        <span>Log In</span>
      </button>
    );
  }

  // User is logged in
  return (
    <div className="user-menu-container">
      {!hideUsername ? (
        <div className="user-profile" onClick={toggleMenu}>
          <img src={getAvatarUrl(currentUser.username, currentUser.photoURL)} alt={currentUser.displayName} className="user-avatar" />
          <span className="user-name">{currentUser.displayName}</span>
        </div>
      ) : (
        // If hideUsername is true, just show the logout button with text
        <button onClick={handleAuth} className={`dropdown-item ${className}`}>
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
          
          <button onClick={handleAuth} className="dropdown-item">
            <FaSignOutAlt className="auth-icon" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginButton;