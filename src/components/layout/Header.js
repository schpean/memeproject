import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          bossme.me
        </Link>
        <nav>
          <ul>
            <Link to="/">Home</Link>
           {/* <Link to="/create">Create Meme</Link>*/}
            <Link to="/howto">How-to-meme</Link>
            <Link to="/browse">Browse</Link>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;