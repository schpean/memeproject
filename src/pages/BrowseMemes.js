import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';
import MemeCard from '../components/meme/MemeCard';
import { API_ENDPOINTS } from '../utils/config';
import { Link } from 'react-router-dom';

const BrowseMemes = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.memes);
        if (!response.ok) {
          throw new Error('Failed to fetch memes');
        }
        const data = await response.json();
        setMemes(data);
      } catch (error) {
        console.error('Error fetching memes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMemes();
  }, []);

  const handleVote = (updatedMeme) => {
    setMemes(memes.map(meme => 
      meme.id === updatedMeme.id ? updatedMeme : meme
    ));
  };

  if (loading) {
    return <div className="loading">Loading memes...</div>;
  }

  return (
    <div className="browse-memes">
      <h1>Browse Memes</h1>
      <div className="meme-grid">
        {memes.map(meme => (
          <MemeCard key={meme.id} meme={meme} onVote={handleVote} />
        ))}
      </div>
      {memes.length === 0 && !loading && (
        <div className="no-memes-message">
          <h2>No memes found</h2>
          <p>Be the first to share a meme!</p>
          <Link to="/howto" className="create-meme-link">Create New Meme</Link>
        </div>
      )}
    </div>
  );
};

export default BrowseMemes;