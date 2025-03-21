import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/CompanyPage.css';

const CompanyPage = () => {
  const { companyName } = useParams();
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyMemes = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/memes?company=${encodeURIComponent(companyName)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch company memes');
        }
        const data = await response.json();
        setMemes(data);
      } catch (error) {
        console.error('Error fetching company memes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyMemes();
  }, [companyName]);

  const handleVote = (updatedMeme) => {
    setMemes(memes.map(meme => 
      meme.id === updatedMeme.id ? updatedMeme : meme
    ));
  };

  if (loading) {
    return <div className="loading">Loading memes...</div>;
  }

  return (
    <div className="company-page">
      <h1>Memes from {companyName}</h1>
      <div className="memes-grid">
        {memes.map(meme => (
          <MemeCard key={meme.id} meme={meme} onVote={handleVote} />
        ))}
      </div>
    </div>
  );
};

export default CompanyPage;