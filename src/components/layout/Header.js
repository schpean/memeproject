import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginButton from '../auth/LoginButton';
import './Header.css';
import { FaUserCircle, FaAngleDown } from 'react-icons/fa';

function Header() {
  const { currentUser, isAdmin, isModerator } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
  
  const toggleMenu = () => setMenuOpen(!menuOpen);
  
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          bossme.me
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
                  <FaUserCircle className="user-icon" />
                  <span className="username">{currentUser.username || currentUser.displayName}</span>
                  <FaAngleDown className={`dropdown-icon ${menuOpen ? 'open' : ''}`} />
                </button>
                
                {menuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-info">
                      <FaUserCircle className="user-avatar" />
                      <div className="user-details">
                        <span className="user-name">{currentUser.displayName}</span>
                      </div>
                    </div>
                    
                    <div className="menu-items">
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
                      
                      <LoginButton className="menu-item logout-item" />
                    </div>
                  </div>
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