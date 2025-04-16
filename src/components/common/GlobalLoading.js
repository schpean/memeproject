import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './GlobalLoading.css';

/**
 * Componenta de loading global care se afișează peste întreaga aplicație
 * când se efectuează operațiuni care necesită așteptare.
 */
const GlobalLoading = () => {
  const { globalLoading } = useAuth();

  if (!globalLoading) return null;

  return (
    <div className="global-loading-overlay">
      <div className="global-loading-container">
        <div className="global-loading-spinner"></div>
        <div className="global-loading-text">Se încarcă...</div>
      </div>
    </div>
  );
};

export default GlobalLoading; 