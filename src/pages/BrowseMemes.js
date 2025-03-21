import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';

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
          <div key={meme.id} className="meme-card">
            <img src={`http://localhost:5000${meme.image_url}`} alt={`Meme from ${meme.company}`} />
            <div className="meme-info">
              <p><strong>Company:</strong> {meme.company}</p>
              <p><strong>Quote:</strong> {meme.manager_quote}</p>
              <p><strong>Country:</strong> {meme.country}</p>
              <p><strong>Manager Type:</strong> {meme.manager_type}</p>
              <p><strong>Votes:</strong> {meme.votes}</p>
              <button onClick={() => handleVote(meme.id)}>Vote</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseMemes;