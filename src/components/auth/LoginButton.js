import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './LoginButton.css';
import { FaSignInAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';
import api from '../../api/api';

const LoginButton = ({ className = '' }) => {
  const { currentUser, loginWithGoogle, logout, needsVerification, resendVerificationEmail } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openNicknameModal = () => {
    setNewNickname('');
    setNicknameError('');
    setShowNicknameModal(true);
    setIsMenuOpen(false);
  };

  const closeNicknameModal = () => {
    setShowNicknameModal(false);
  };

  const handleNicknameChange = (e) => {
    setNewNickname(e.target.value);
    if (nicknameError) setNicknameError('');
  };

  const updateNickname = async () => {
    if (!newNickname.trim()) {
      setNicknameError('Nickname cannot be empty');
      return;
    }

    if (newNickname.trim().length < 3) {
      setNicknameError('Nickname must be at least 3 characters');
      return;
    }

    if (newNickname.trim().length > 30) {
      setNicknameError('Nickname must be less than 30 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.userApi.updateNickname(newNickname.trim());
      window.location.reload(); // Reload to update UI with new nickname
    } catch (error) {
      setNicknameError(error.message || 'Failed to update nickname');
      setIsSubmitting(false);
    }
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
      <div className="user-profile" onClick={toggleMenu}>
        <img src={currentUser.photoURL} alt={currentUser.displayName} className="user-avatar" />
        <span className="user-name">{currentUser.displayName}</span>
      </div>

      {isMenuOpen && (
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
          
          {/* Add nickname change option if user hasn't changed it yet */}
          {!currentUser.nickname_changed && (
            <button onClick={openNicknameModal} className="dropdown-item">
              <FaUser className="auth-icon" />
              <span>Change Nickname</span>
            </button>
          )}
          
          <button onClick={handleAuth} className="dropdown-item">
            <FaSignOutAlt className="auth-icon" />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* Nickname change modal */}
      {showNicknameModal && (
        <div className="modal-overlay">
          <div className="nickname-modal">
            <h3>Change Your Nickname</h3>
            <p className="nickname-info">
              You can change your nickname only once, so choose wisely!
            </p>
            
            <div className="form-group">
              <label htmlFor="nickname">New Nickname:</label>
              <input
                type="text"
                id="nickname"
                value={newNickname}
                onChange={handleNicknameChange}
                placeholder="Enter your new nickname"
                disabled={isSubmitting}
              />
              {nicknameError && <div className="error-message">{nicknameError}</div>}
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={closeNicknameModal} 
                className="btn secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                onClick={updateNickname} 
                className="btn primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Save Nickname'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginButton;