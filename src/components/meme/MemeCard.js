import React from 'react';
import './styles/MemeCard.css';

const MemeCard = ({ meme, onVote }) => {
  const handleVote = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/memes/${meme.id}/vote`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      const updatedMeme = await response.json();
      onVote(updatedMeme);
    } catch (error) {
      console.error('Error voting on meme:', error);
    }
  };

  return (
    <div className="meme-card">
      <img src={`http://localhost:5000${meme.image_url}`} alt={`Meme from ${meme.company}`} />
      <div className="meme-info">
        <p><strong>Company:</strong> {meme.company}</p>
        <p><strong>Quote:</strong> {meme.manager_quote}</p>
        <p><strong>Country:</strong> {meme.country}</p>
        <p><strong>Manager Type:</strong> {meme.manager_type}</p>
        <p><strong>Votes:</strong> {meme.votes}</p>
        <button onClick={handleVote}>Vote</button>
      </div>
    </div>
  );
};

export default MemeCard;