import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginButton from '../auth/LoginButton';
import './Header.css';
import { FaAngleDown } from 'react-icons/fa';
import { getDicebearAvatarUrl } from '../../utils/avatarUtils';
import NicknameModal from '../auth/NicknameModal';

function Header() {
  const { currentUser, isAdmin, isModerator } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [animateLogo, setAnimateLogo] = useState(false);
  const menuRef = useRef(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Animate logo on page load
  useEffect(() => {
    // Add a small delay to make the animation more noticeable
    const timer = setTimeout(() => {
      setAnimateLogo(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  const toggleMenu = () => setMenuOpen(!menuOpen);
  
  const openNicknameModal = () => {
    setShowNicknameModal(true);
    setMenuOpen(false);
  };
  
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <div className="logo-container">
            <span className="logo-text">boss</span>
            <span className="logo-text">me</span>
            <span className="logo-dot">.</span>
            <span className={`logo-me ${animateLogo ? 'animate' : ''}`}>me</span>
          </div>
        </Link>
        <div className="header-right">
          <nav className="main-nav">
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/howto">How-to-meme</Link></li>
              <li><Link to="/browse">Browse</Link></li>
            </ul>
          </nav>
          <div className="auth-section">
            {currentUser ? (
              <div className="user-menu-container" ref={menuRef}>
                <button className="user-menu-button" onClick={toggleMenu}>
                  <img 
                    src={getDicebearAvatarUrl(currentUser.username || currentUser.displayName)} 
                    alt={currentUser.username} 
                    className="user-icon" 
                  />
                  <span className="username">{currentUser.username || currentUser.displayName}</span>
                  <FaAngleDown className={`dropdown-icon ${menuOpen ? 'open' : ''}`} />
                </button>
                
                {menuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="menu-items">
                      {!currentUser.nickname_changed && (
                        <button 
                          className="menu-item nickname-link" 
                          onClick={openNicknameModal}
                        >
                          Change Nickname
                        </button>
                      )}
                      
                      <Link to="/mymemes" className="menu-item mymemes-link" onClick={toggleMenu}>
                        My memes
                      </Link>
                      
                      {(isAdmin || isModerator) && (
                        <Link to="/pending" className="menu-item pending-link" onClick={toggleMenu}>
                          Pending Approval
                        </Link>
                      )}
                      
                      {isAdmin && (
                        <Link to="/admin" className="menu-item admin-link" onClick={toggleMenu}>
                          Admin Panel
                        </Link>
                      )}
                      
                      <LoginButton className="menu-item logout-item" hideUsername={true} />
                    </div>
                  </div>
                )}
                
                {showNicknameModal && (
                  <NicknameModal 
                    onClose={() => setShowNicknameModal(false)}
                  />
                )}
              </div>
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;