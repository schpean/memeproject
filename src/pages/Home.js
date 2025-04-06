import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/Home.css';
import { API_ENDPOINTS } from '../utils/config';
import { FaFire, FaChartLine, FaClock, FaAngleDown } from 'react-icons/fa';

const Home = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest'); // 'latest', 'top', 'hot'
  const [timeFilter, setTimeFilter] = useState('all'); // 'now', 'today', 'week', 'all'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  
  const sortDropdownRef = useRef(null);
  const timeDropdownRef = useRef(null);
  
  useEffect(() => {
    fetchMemes();
  }, [sortBy, timeFilter]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Close sort dropdown if click is outside
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
      
      // Close time dropdown if click is outside
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setShowTimeDropdown(false);
      }
    }
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const fetchMemes = async () => {
    setLoading(true);
    try {
      let url = API_ENDPOINTS.memes;
      
      // Add query parameters for sorting and time filtering
      const params = new URLSearchParams();
      
      if (sortBy !== 'latest') {
        params.append('sort', sortBy);
      }
      
      if (timeFilter !== 'all') {
        params.append('time', timeFilter);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch memes');
      }
      
      const data = await response.json();
      
      // Filter locally based on time if server doesn't support time filtering
      let filteredData = data;
      
      if (timeFilter !== 'all' && !url.includes('time=')) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        filteredData = data.filter(meme => {
          const memeDate = new Date(meme.created_at || meme.createdAt);
          
          if (timeFilter === 'now') {
            return (now - memeDate) < 3600000; // Within the last hour
          }
          
          if (timeFilter === 'today') {
            return memeDate >= today;
          }
          
          if (timeFilter === 'week') {
            return memeDate >= weekAgo;
          }
          
          return true;
        });
      }
      
      // Apply sorting locally if server doesn't support sorting
      let sortedData = filteredData;
      
      if (sortBy !== 'latest' && !url.includes('sort=')) {
        if (sortBy === 'top') {
          sortedData = [...filteredData].sort((a, b) => (b.votes || 0) - (a.votes || 0));
        } else if (sortBy === 'hot') {
          // Simple hot algorithm: upvotes / (age in hours + 2)^1.5
          const now = new Date();
          sortedData = [...filteredData].sort((a, b) => {
            const aDate = new Date(a.created_at || a.createdAt);
            const bDate = new Date(b.created_at || b.createdAt);
            const aHours = Math.max(1, (now - aDate) / 3600000);
            const bHours = Math.max(1, (now - bDate) / 3600000);
            const aHot = (a.votes || 0) / Math.pow(aHours + 2, 1.5);
            const bHot = (b.votes || 0) / Math.pow(bHours + 2, 1.5);
            return bHot - aHot;
          });
        }
      }
      
      // Show only first 8 memes for more compact view
      setMemes(sortedData.slice(0, 8));
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (updatedMeme) => {
    setMemes(memes.map(meme => 
      meme.id === updatedMeme.id ? updatedMeme : meme
    ));
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'top':
        return <FaChartLine />;
      case 'hot':
        return <FaFire />;
      default:
        return <FaClock />;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'top':
        return 'Top';
      case 'hot':
        return 'Hot';
      default:
        return 'Latest';
    }
  };

  const getTimeFilterLabel = () => {
    switch (timeFilter) {
      case 'now':
        return 'Now';
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      default:
        return 'All Time';
    }
  };

  if (loading && memes.length === 0) {
    return <div className="loading">Loading memes...</div>;
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Expose the Fun. Share the Struggles. Meme Your Workplace!</h1>
          <p>Review your company the way it deserves—with memes and fire.</p>
          <div className="hero-cta-buttons">
            <Link to="/howto" className="btn btn-primary">Upload a meme review</Link>
            <Link to="/browse" className="btn btn-secondary">Find your company</Link>
          </div>
        </div>
        <div className="hero-background">
          {/* Animated meme icons or carousel could be added here */}
        </div>
      </section>
      
      <div className="memes-section compact-view">
        <div className="section-header">
          <div className="section-title">
            <h2>Reviews</h2>
          </div>
          
          <div className="filter-controls">
            {/* Sort filter dropdown */}
            <div className="filter-dropdown" ref={sortDropdownRef}>
              <button 
                className="dropdown-toggle" 
                onClick={() => setShowSortDropdown(!showSortDropdown)}
              >
                <span className="icon">{getSortIcon()}</span>
                <span>{getSortLabel()}</span>
                <FaAngleDown />
              </button>
              
              {showSortDropdown && (
                <div className="dropdown-menu">
                  <button 
                    className={sortBy === 'latest' ? 'active' : ''} 
                    onClick={() => { setSortBy('latest'); setShowSortDropdown(false); }}
                  >
                    <FaClock /> Latest
                  </button>
                  <button 
                    className={sortBy === 'top' ? 'active' : ''} 
                    onClick={() => { setSortBy('top'); setShowSortDropdown(false); }}
                  >
                    <FaChartLine /> Top
                  </button>
                  <button 
                    className={sortBy === 'hot' ? 'active' : ''} 
                    onClick={() => { setSortBy('hot'); setShowSortDropdown(false); }}
                  >
                    <FaFire /> Hot
                  </button>
                </div>
              )}
            </div>
            
            {/* Time filter dropdown */}
            <div className="filter-dropdown" ref={timeDropdownRef}>
              <button 
                className="dropdown-toggle" 
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              >
                <span>{getTimeFilterLabel()}</span>
                <FaAngleDown />
              </button>
              
              {showTimeDropdown && (
                <div className="dropdown-menu">
                  <button 
                    className={timeFilter === 'now' ? 'active' : ''} 
                    onClick={() => { setTimeFilter('now'); setShowTimeDropdown(false); }}
                  >
                    Now
                  </button>
                  <button 
                    className={timeFilter === 'today' ? 'active' : ''} 
                    onClick={() => { setTimeFilter('today'); setShowTimeDropdown(false); }}
                  >
                    Today
                  </button>
                  <button 
                    className={timeFilter === 'week' ? 'active' : ''} 
                    onClick={() => { setTimeFilter('week'); setShowTimeDropdown(false); }}
                  >
                    This Week
                  </button>
                  <button 
                    className={timeFilter === 'all' ? 'active' : ''} 
                    onClick={() => { setTimeFilter('all'); setShowTimeDropdown(false); }}
                  >
                    All Time
                  </button>
                </div>
              )}
            </div>
            
            <Link to="/browse" className="view-all-link">View All</Link>
          </div>
        </div>
        
        <div className="memes-grid">
          {memes.length > 0 ? (
            memes.map(meme => (
              <MemeCard key={meme.id} meme={meme} onVote={handleVote} compact={true} />
            ))
          ) : (
            <div className="no-memes">
              <p>No memes found for the selected filters.</p>
              <Link to="/howto" className="btn btn-primary">Create a Meme</Link>
            </div>
          )}
        </div>
        
        {loading && <div className="loading-more">Loading more memes...</div>}
      </div>
    </div>
  );
};

export default Home;