import React, { useState, useEffect } from 'react';
import '../styles/BrowseMemes.css';
import MemeCard from '../components/meme/MemeCard';
import MetaTags from '../components/common/MetaTags';
import { API_ENDPOINTS } from '../utils/config';
import { Link } from 'react-router-dom';
import { FaSort, FaCalendarAlt, FaComment, FaArrowUp, FaSearch, FaTimes, FaChevronDown, FaChevronUp, FaBuilding, FaChevronRight, FaChevronLeft, FaHome } from 'react-icons/fa';
import { memeApi } from '../api/api';

const BrowseMemes = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyPageIndex, setCompanyPageIndex] = useState(0);
  
  // Companies per row
  const COMPANIES_PER_ROW = 6;

  // Full list of companies with bossme.me added at the beginning
  const allCompanies = [
    'bossme.me',
    'Accenture',
    'Amazon',
    'Adobe',
    'Atos',
    'Bitdefender',
    'Bosch',
    'Continental',
    'Dell',
    'Deloitte',
    'Endava',
    'Ericsson',
    'Google',
    'HP',
    'Huawei',
    'IBM',
    'Intel',
    'Luxoft',
    'Meta',
    'Microsoft',
    'NTT Data',
    'Nokia',
    'Oracle',
    'Orange',
    'SAP',
    'Siemens',
    'Spotify',
    'Thales',
    'UiPath',
    'Vodafone',
    'Wipro'
  ];

  // Sort options
  const sortOptions = [
    { id: 'recent', label: 'Most Recent', icon: <FaCalendarAlt /> },
    { id: 'comments', label: 'Most Comments', icon: <FaComment /> },
    { id: 'votes', label: 'Most Votes', icon: <FaArrowUp /> }
  ];

  // Filter companies based on search term
  const filteredCompanies = searchTerm 
    ? allCompanies.filter(company => 
        company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCompanies;
    
  // Calculate total pages for company pagination
  const totalCompanyPages = Math.ceil(filteredCompanies.length / COMPANIES_PER_ROW);
  
  // Get companies for current page
  const getCurrentPageCompanies = () => {
    // If on first page and not searching, make sure bossme.me is the first company
    if (companyPageIndex === 0 && !searchTerm) {
      const firstPage = filteredCompanies.slice(0, COMPANIES_PER_ROW);
      // If bossme.me is not already in the first page companies, replace the last one
      if (!firstPage.includes('bossme.me')) {
        firstPage[firstPage.length - 1] = 'bossme.me';
      }
      return firstPage;
    }
    
    const startIndex = companyPageIndex * COMPANIES_PER_ROW;
    return filteredCompanies.slice(startIndex, startIndex + COMPANIES_PER_ROW);
  };
  
  // Move to next page of companies
  const nextCompanyPage = () => {
    if (companyPageIndex < totalCompanyPages - 1) {
      setCompanyPageIndex(companyPageIndex + 1);
    }
  };
  
  // Move to previous page of companies
  const prevCompanyPage = () => {
    if (companyPageIndex > 0) {
      setCompanyPageIndex(companyPageIndex - 1);
    }
  };

  // Check if a company is bossme.me for special styling
  const isBossmeMeCompany = (company) => {
    return company === 'bossme.me';
  };

  useEffect(() => {
    // Reset pagination when search changes
    setCompanyPageIndex(0);
  }, [searchTerm]);

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
    <>
      <MetaTags 
        title={selectedCompany 
          ? `${selectedCompany} Memes & Reviews | bossme.me` 
          : "Browse Workplace Memes & Reviews | bossme.me"}
        description={selectedCompany 
          ? `Check out the latest meme reviews about ${selectedCompany}. Share your workplace experience with funny memes!` 
          : "Browse and discover meme reviews about companies, workplaces and bosses. Filter by company or sort by popularity."}
        image="/images/browse-memes-cover.jpg"
        type="website"
      />
      
    <div className="browse-memes">
      <h1>Browse meme based reviews</h1>
      
      <div className="browse-controls">
        <div className="controls-header">
          <h2><FaBuilding /> Filter by Company</h2>
          
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
        
        <div className="company-filter-section compact">
          <div className="search-wrapper">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search companies..."
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
          
          <div className="company-grid-container">
            <button 
              className="company-nav prev"
              onClick={prevCompanyPage}
              disabled={companyPageIndex === 0}
            >
              <FaChevronLeft />
            </button>
            
            <div className="company-grid single-row">
              {getCurrentPageCompanies().map(company => (
                <div 
                  key={company}
                  className={`company-card ${selectedCompany === company ? 'selected' : ''} ${isBossmeMeCompany(company) ? 'bossme-card' : ''}`}
                  onClick={() => handleCompanySelect(company)}
                >
                  {isBossmeMeCompany(company) && <FaHome className="bossme-icon" />}
                  <span className="company-name">{company}</span>
                </div>
              ))}
            </div>
            
            <button 
              className="company-nav next"
              onClick={nextCompanyPage}
              disabled={companyPageIndex >= totalCompanyPages - 1}
            >
              <FaChevronRight />
            </button>
          </div>
          
          <div className="pagination-indicator">
            <span>Page {companyPageIndex + 1} of {totalCompanyPages}</span>
          </div>
          
          {selectedCompany && (
            <div className="selected-filter">
              <span>Filtering by: <strong>{selectedCompany}</strong></span>
              {selectedCompany === 'bossme.me' && (
                <div className="bossme-description">General workplace memes not specific to any company</div>
              )}
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
    </>
  );
};

export default BrowseMemes;