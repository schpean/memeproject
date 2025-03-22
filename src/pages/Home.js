import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/Home.css';

const Home = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/memes');
        if (!response.ok) {
          throw new Error('Failed to fetch memes');
        }
        const data = await response.json();
        setMemes(data);
        
        // Extract unique companies
        const uniqueCompanies = [...new Set(data.map(meme => meme.company))];
        setCompanies(uniqueCompanies);
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
    <div className="home">
  
      
      <div className="companies-section">
        <h2>Browse by Company</h2>
        <div className="companies-grid">
          {companies.map(company => (
            <Link key={company} to={`/company/${company}`} className="company-link">
              {company}
            </Link>
          ))}
        </div>
      </div>

      <div className="memes-section">
        <h2>Latest Memes</h2>
        <div className="memes-grid">
          {memes.map(meme => (
            <MemeCard key={meme.id} meme={meme} onVote={handleVote} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;