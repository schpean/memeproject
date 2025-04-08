import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/api';
import './LoginButton.css'; // Reuse styling from LoginButton

const NicknameModal = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="nickname-modal" onClick={e => e.stopPropagation()}>
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
            onClick={onClose} 
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
  );
};

export default NicknameModal; 