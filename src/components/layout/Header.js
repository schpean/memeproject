import React from 'react';
import { Link } from 'react-router-dom';
import LoginButton from '../auth/LoginButton';
import './Header.css';

function Header() {
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
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;