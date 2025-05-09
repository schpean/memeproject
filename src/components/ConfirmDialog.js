import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './styles/ConfirmDialog.css';
import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';

const ConfirmDialog = ({ 
  isOpen, 
  title = 'Confirmare',
  message, 
  confirmText = 'Da',
  cancelText = 'Nu',
  confirmButtonClass = 'danger',
  icon = 'warning',
  onConfirm, 
  onCancel 
}) => {
  
  useEffect(() => {
    // Disable background scrolling when dialog is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    // Re-enable scrolling when dialog closes
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Handle Escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onCancel]);
  
  if (!isOpen) return null;
  
  // Choose icon based on prop
  const renderIcon = () => {
    switch(icon) {
      case 'warning':
        return <FaExclamationTriangle className="dialog-icon warning" />;
      case 'success':
        return <FaCheck className="dialog-icon success" />;
      default:
        return <FaExclamationTriangle className="dialog-icon warning" />;
    }
  };
  
  // Render dialog directly into body to avoid CSS conflicts
  return ReactDOM.createPortal(
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          {renderIcon()}
          <h3>{title}</h3>
          <button className="close-button" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        
        <div className="dialog-content">
          <p>{message}</p>
        </div>
        
        <div className="dialog-actions">
          <button 
            className="cancel-button" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-button ${confirmButtonClass}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog; 