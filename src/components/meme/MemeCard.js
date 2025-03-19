import React from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import '../../styles/MemeCard.css';

function MemeCard({ meme }) {
  const { id, imageUrl, company, managerQuote, country, managerType, votes } = meme;
  
  const handleUpvote = async (e) => {
    e.preventDefault(); // Prevent link navigation
    
    try {
      const memeRef = doc(db, 'memes', id);
      await updateDoc(memeRef, {
        votes: increment(1)
      });
      
      // Update UI optimistically (you could use state management here)
      const voteCount = document.getElementById(`vote-count-${id}`);
      if (voteCount) {
        voteCount.textContent = parseInt(voteCount.textContent) + 1;
      }
    } catch (error) {
      console.error('Error upvoting meme:', error);
    }
  };
  
  return (
    <div className="meme-card">
      <div className="meme-image-container">
        <img src={imageUrl} alt="Manager Rant Meme" className="meme-image" />
      </div>
      
      <div className="meme-content">
        <h3>Manager at {company}</h3>
        <p className="quote">"{managerQuote}"</p>
        
        <div className="meme-metadata">
          <span className="country">{country}</span>
          <span className="manager-type">{managerType}</span>
        </div>
        
        <div className="meme-actions">
          <div className="vote-section">
            <button className="vote-button" onClick={handleUpvote}>
              🔥 Upvote
            </button>
            <span id={`vote-count-${id}`} className="vote-count">
              {votes || 0}
            </span>
            <span className="vote-label">rage points</span>
          </div>
          
          <Link to={`/company/${company}`} className="company-link">
            See all from {company}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MemeCard;