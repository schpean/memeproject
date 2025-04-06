import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';
import MemeCard from '../components/meme/MemeCard';
import { API_ENDPOINTS } from '../utils/config';
import { Link } from 'react-router-dom';
import { FaSort, FaCalendarAlt, FaComment, FaArrowUp, FaSearch, FaTimes } from 'react-icons/fa';
import { memeApi } from '../api/api';

const BrowseMemes = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Restore the original company list
  const companyOptions = [
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

  // Sort options
  const sortOptions = [
    { id: 'recent', label: 'Most Recent', icon: <FaCalendarAlt /> },
    { id: 'comments', label: 'Most Comments', icon: <FaComment /> },
    { id: 'votes', label: 'Most Votes', icon: <FaArrowUp /> }
  ];

  // Filter companies based on search term
  const filteredCompanies = searchTerm 
    ? companyOptions.filter(company => 
        company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : companyOptions;

  useEffect(() => {
    const fetchMemes = async () => {
      try {
        const response = await fetch(selectedCompany
          ? `${API_ENDPOINTS.memes}?company=${selectedCompany}`
          : API_ENDPOINTS.memes
        );
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
  }, [selectedCompany]);

  const toggleSortMenu = () => {
    setSortMenuOpen(!sortMenuOpen);
  };

  const selectSortOption = (option) => {
    setSortBy(option);
    setSortMenuOpen(false);
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company === selectedCompany ? '' : company);
    setLoading(true);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Sort memes based on selected option
  const sortedMemes = [...memes].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
    } else if (sortBy === 'votes') {
      return (b.votes || 0) - (a.votes || 0);
    } else if (sortBy === 'comments') {
      return (b.commentCount || 0) - (a.commentCount || 0);
    }
    return 0;
  });

  const handleVote = (updatedMeme) => {
    setMemes(memes.map(meme => 
      meme.id === updatedMeme.id ? { ...updatedMeme, commentCount: meme.commentCount } : meme
    ));
  };

  if (loading) {
    return <div className="loading">Loading memes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="browse-memes">
      <h1>Browse meme based reviews</h1>
      
      <div className="browse-controls">
        <div className="controls-header">
          <h2>Filter by Company</h2>
          
          <div className="sort-control">
            <button className="sort-button" onClick={toggleSortMenu}>
              <FaSort />
              <span>Sort: {sortOptions.find(opt => opt.id === sortBy)?.label}</span>
            </button>
            
            {sortMenuOpen && (
              <div className="sort-menu">
                {sortOptions.map(option => (
                  <button
                    key={option.id}
                    className={`sort-option ${sortBy === option.id ? 'active' : ''}`}
                    onClick={() => selectSortOption(option.id)}
                  >
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="company-filter-section">
          <div className="search-wrapper">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="company-search"
              />
              {searchTerm && (
                <button className="clear-search" onClick={clearSearch}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          
          <div className="company-grid">
            {filteredCompanies.map(company => (
              <div 
                key={company}
                className={`company-card ${selectedCompany === company ? 'selected' : ''}`}
                onClick={() => handleCompanySelect(company)}
              >
                <span className="company-name">{company}</span>
              </div>
            ))}
          </div>
          
          {selectedCompany && (
            <div className="selected-filter">
              <span>Filtering by: <strong>{selectedCompany}</strong></span>
              <button className="clear-filter" onClick={() => handleCompanySelect(selectedCompany)}>
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="meme-grid">
        {sortedMemes.length > 0 ? (
          sortedMemes.map(meme => (
            <MemeCard key={meme.id} meme={meme} onVote={handleVote} compact={true} />
          ))
        ) : (
          <div className="no-memes-message">
            <h2>No memes found</h2>
            <p>{selectedCompany ? `No memes found for ${selectedCompany}` : 'Be the first to share a meme!'}</p>
            <Link to="/howto" className="create-meme-link">Create New Meme</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseMemes;