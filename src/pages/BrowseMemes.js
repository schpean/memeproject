import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';
import MemeCard from '../components/meme/MemeCard';

const BrowseMemes = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/memes');
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

  const handleVote = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/memes/${id}/vote`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to vote');
      }
      const updatedMeme = await response.json();
      setMemes(memes.map(meme => 
        meme.id === id ? updatedMeme : meme
      ));
    } catch (error) {
      console.error('Error voting on meme:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading memes...</div>;
  }

  return (
    <div className="browse-memes">
      <h1>Browse Memes</h1>
      <div className="meme-grid">
        {memes.map(meme => (
          <MemeCard key={meme.id} meme={meme} />
        ))}
      </div>
    </div>
  );
};

export default BrowseMemes;