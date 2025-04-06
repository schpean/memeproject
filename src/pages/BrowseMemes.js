import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';
import MemeCard from '../components/meme/MemeCard';
import { API_ENDPOINTS } from '../utils/config';
import { Link } from 'react-router-dom';
import { FaSort, FaCalendarAlt, FaComment, FaArrowUp } from 'react-icons/fa';

const BrowseMemes = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  
  // Static list of predefined companies
  const companies = [
    'Google', 
    'Microsoft', 
    'UiPath', 
    'Endava', 
    'Bitdefender', 
    'Amazon', 
    'Deloitte', 
    'Oracle', 
    'IBM', 
    'Atos',
    'Luxoft'
  ];

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.memes);
        if (!response.ok) {
          throw new Error('Failed to fetch memes');
        }
        const data = await response.json();
        // Also fetch comment counts for each meme
        const memesWithCommentCounts = await Promise.all(
          data.map(async (meme) => {
            try {
              const commentsResponse = await fetch(API_ENDPOINTS.getComments(meme.id));
              if (!commentsResponse.ok) {
                return { ...meme, commentCount: 0 };
              }
              const comments = await commentsResponse.json();
              return { ...meme, commentCount: comments.length };
            } catch (error) {
              console.error(`Error fetching comments for meme ${meme.id}:`, error);
              return { ...meme, commentCount: 0 };
            }
          })
        );
        setMemes(memesWithCommentCounts);
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
      meme.id === updatedMeme.id ? { ...updatedMeme, commentCount: meme.commentCount } : meme
    ));
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company === selectedCompany ? null : company);
  };

  const handleSortChange = (sortOption) => {
    setSortBy(sortOption);
    setSortMenuOpen(false);
  };

  const toggleSortMenu = () => {
    setSortMenuOpen(!sortMenuOpen);
  };

  // Filter by company first
  const filteredMemes = selectedCompany 
    ? memes.filter(meme => meme.company === selectedCompany)
    : memes;

  // Then sort according to selection
  const sortedMemes = [...filteredMemes].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
      case 'upvoted':
        return (b.votes || 0) - (a.votes || 0);
      case 'commented':
        return (b.commentCount || 0) - (a.commentCount || 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return <div className="loading">Loading memes...</div>;
  }

  return (
    <div className="browse-memes">
      <h1>Browse meme based reviews</h1>
      
      <div className="browse-controls">
        <div className="company-filter-section">
          <h2>Filter by Company</h2>
          <div className="company-buttons">
            {companies.map(company => (
              <button 
                key={company}
                className={`company-button ${selectedCompany === company ? 'selected' : ''}`}
                onClick={() => handleCompanySelect(company)}
              >
                {company}
              </button>
            ))}
          </div>
          {selectedCompany && (
            <div className="clear-filter">
              <button onClick={() => setSelectedCompany(null)}>Clear Filter</button>
            </div>
          )}
        </div>

        <div className="sort-section">
          <div className="sort-dropdown">
            <button className="sort-button" onClick={toggleSortMenu}>
              <FaSort /> Sort: {sortBy === 'recent' ? 'Most Recent' : sortBy === 'upvoted' ? 'Most Upvoted' : 'Most Commented'}
            </button>
            {sortMenuOpen && (
              <div className="sort-menu">
                <button 
                  className={`sort-option ${sortBy === 'recent' ? 'active' : ''}`} 
                  onClick={() => handleSortChange('recent')}
                >
                  <FaCalendarAlt /> Most Recent
                </button>
                <button 
                  className={`sort-option ${sortBy === 'upvoted' ? 'active' : ''}`} 
                  onClick={() => handleSortChange('upvoted')}
                >
                  <FaArrowUp /> Most Upvoted
                </button>
                <button 
                  className={`sort-option ${sortBy === 'commented' ? 'active' : ''}`} 
                  onClick={() => handleSortChange('commented')}
                >
                  <FaComment /> Most Commented
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="meme-grid">
        {sortedMemes.map(meme => (
          <MemeCard key={meme.id} meme={meme} onVote={handleVote} compact={true} />
        ))}
      </div>
      {sortedMemes.length === 0 && !loading && (
        <div className="no-memes-message">
          <h2>No memes found</h2>
          <p>{selectedCompany ? `No memes found for ${selectedCompany}` : 'Be the first to share a meme!'}</p>
          <Link to="/howto" className="create-meme-link">Create New Meme</Link>
        </div>
      )}
    </div>
  );
};

export default BrowseMemes;