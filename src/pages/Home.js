import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/Home.css';
import { API_ENDPOINTS } from '../utils/config';
import { FaFire, FaChartLine, FaClock, FaAngleDown, FaSort, FaCalendarAlt, FaComment, FaArrowUp } from 'react-icons/fa';

const Home = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'upvoted', 'commented'
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
      
      // Add query parameters for time filtering
      const params = new URLSearchParams();
      
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
      
      // Fetch comment counts for memes if sorting by comments
      let memesWithCommentCounts = filteredData;
      
      if (sortBy === 'commented') {
        memesWithCommentCounts = await Promise.all(
          filteredData.map(async (meme) => {
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
      }
      
      // Apply sorting locally
      let sortedData = memesWithCommentCounts;
      
      switch (sortBy) {
        case 'upvoted':
          sortedData = [...memesWithCommentCounts].sort((a, b) => (b.votes || 0) - (a.votes || 0));
          break;
        case 'commented':
          sortedData = [...memesWithCommentCounts].sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
          break;
        case 'recent':
        default:
          sortedData = [...memesWithCommentCounts].sort((a, b) => 
            new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
          );
          break;
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
      case 'upvoted':
        return <FaArrowUp />;
      case 'commented':
        return <FaComment />;
      case 'recent':
      default:
        return <FaCalendarAlt />;
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'upvoted':
        return 'Most Upvoted';
      case 'commented':
        return 'Most Commented';
      case 'recent':
      default:
        return 'Most Recent';
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
                    className={sortBy === 'recent' ? 'active' : ''} 
                    onClick={() => { setSortBy('recent'); setShowSortDropdown(false); }}
                  >
                    <FaCalendarAlt /> Most Recent
                  </button>
                  <button 
                    className={sortBy === 'upvoted' ? 'active' : ''} 
                    onClick={() => { setSortBy('upvoted'); setShowSortDropdown(false); }}
                  >
                    <FaArrowUp /> Most Upvoted
                  </button>
                  <button 
                    className={sortBy === 'commented' ? 'active' : ''} 
                    onClick={() => { setSortBy('commented'); setShowSortDropdown(false); }}
                  >
                    <FaComment /> Most Commented
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