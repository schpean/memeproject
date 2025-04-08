import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';
import errorMeme from '../assets/images/error/404-meme.jpg';

function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <span className="error-code">404</span>
        <h1>What are you doing here?</h1>
        <p>You've clearly reached the end of memenet. This page doesn't exist or has been moved to another dimension.</p>
        
        <div className="error-image-container">
          <img 
            src={errorMeme} 
            alt="Error meme" 
            className="error-image"
          />
        </div>
        
        <Link to="/" className="home-link">Return to Homepage</Link>
      </div>
    </div>
  );
}

export default NotFound;