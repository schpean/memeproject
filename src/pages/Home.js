import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/Home.css';
import CompanySection from '../components/CompanySection';
import { API_ENDPOINTS } from '../utils/config';



const Home = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);


  
  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.memes);
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
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Expose the Fun. Share the Struggles. Meme Your Workplace!</h1>
          <p>Review your company the way it deserves—with memes and upvotes.</p>
          <div className="hero-cta-buttons">
            <Link to="/howto" className="btn btn-primary">Upload a Meme</Link>
            <Link to="/browse" className="btn btn-secondary">Browse Top Memes</Link>
          </div>
        </div>
        <div className="hero-background">
          {/* Animated meme icons or carousel could be added here */}
        </div>
      </section>
      <section>
      <CompanySection companies={companies} />
      </section>
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