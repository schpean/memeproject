import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import './styles/Home.css';
import { API_ENDPOINTS, POLLING_URL, API_BASE_URL } from '../utils/config';
import { FaFire, FaChartLine, FaClock, FaAngleDown, FaSort, FaCalendarAlt, FaComment, FaArrowUp } from 'react-icons/fa';

const Home = () => {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'upvoted', 'commented'
  const [timeFilter, setTimeFilter] = useState('all'); // 'now', 'today', 'week', 'all'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState(Date.now());
  const [usingPolling, setUsingPolling] = useState(false);
  const [refreshFallbackActive, setRefreshFallbackActive] = useState(false);
  
  const sortDropdownRef = useRef(null);
  const timeDropdownRef = useRef(null);
  const webSocketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  // Set up periodic refresh for memes when real-time options fail
  const setupPeriodicRefresh = () => {
    console.log('Setting up periodic meme refresh (every 30 seconds)');
    
    // Clear any existing intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Set flag to prevent further connection attempts
    setRefreshFallbackActive(true);
    
    // Start periodic refresh
    pollingIntervalRef.current = setInterval(() => {
      console.log('Performing periodic meme refresh');
      fetchMemes();
    }, 30000); // Refresh every 30 seconds
  };
  
  // Set up real-time updates with WebSocket and polling fallback
  useEffect(() => {
    // Skip if we're already using the fallback refresh
    if (refreshFallbackActive) {
      return;
    }
    
    // Create WebSocket connection
    const wsUrl = API_ENDPOINTS.websocket;
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    let connectionFailed = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 1; // Reduced to quickly move to fallback
    
    const ws = new WebSocket(wsUrl);
    
    // Set a timeout to detect connection failure
    const connectionTimeout = setTimeout(() => {
      if (!wsConnected) {
        connectionFailed = true;
        console.log('WebSocket connection timed out, switching to polling');
        setupPollingFallback();
      }
    }, 3000);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      clearTimeout(connectionTimeout);
      setWsConnected(true);
      connectionFailed = false;
      reconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'connection') {
          console.log('WebSocket connection confirmed:', data.message);
        } else if (data.type === 'newMeme') {
          // Add the new meme to the list if it matches the current filters
          fetchMemes();
        } else if (data.type === 'memeUpdated') {
          // Update the meme in the current list
          setMemes(prevMemes => 
            prevMemes.map(meme => 
              meme.id === data.data.id ? data.data : meme
            )
          );
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = () => {
      // Use a simpler error message to avoid the noisy Event object in console
      console.log('WebSocket connection failed');
      connectionFailed = true;
      
      // Switch to polling immediately after first error
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Switching to polling fallback');
        setupPollingFallback();
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setWsConnected(false);
      clearTimeout(connectionTimeout);
      
      // Try to reconnect if close wasn't intentional and we haven't switched to fallbacks
      if (!connectionFailed && !usingPolling && !refreshFallbackActive && 
          reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Attempting to reconnect WebSocket (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectAttempts++;
        setTimeout(() => {
          webSocketRef.current = new WebSocket(wsUrl);
        }, 2000);
      } else if (!usingPolling && !refreshFallbackActive) {
        setupPollingFallback();
      }
    };
    
    // Store the WebSocket reference
    webSocketRef.current = ws;
    
    const setupPollingFallback = () => {
      if (usingPolling || refreshFallbackActive) return; // Prevent duplicate setup
      
      console.log('Setting up polling fallback for real-time updates');
      setUsingPolling(true);
      setWsConnected(false);
      
      // Close WebSocket if it's still open
      if (webSocketRef.current && webSocketRef.current.readyState !== WebSocket.CLOSED) {
        webSocketRef.current.close();
      }
      
      // Try polling once to check if endpoint exists
      checkPollingEndpoint();
    };
    
    const checkPollingEndpoint = async () => {
      try {
        console.log('Checking if polling endpoint is available...');
        const response = await fetch(`${POLLING_URL}?since=${lastTimestamp}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Polling endpoint not available, using simple refresh fallback');
            setupPeriodicRefresh();
            return;
          }
          throw new Error(`Polling request failed with status ${response.status}`);
        }
        
        // If we got here, polling works! Start regular polling
        console.log('Polling endpoint working, starting regular polling');
        pollForUpdates();
        pollingIntervalRef.current = setInterval(pollForUpdates, 10000);
      } catch (error) {
        console.log('Polling setup failed, falling back to periodic refresh');
        setupPeriodicRefresh();
      }
    };
    
    const pollForUpdates = async () => {
      try {
        // Only try polling if we haven't disabled it
        if (refreshFallbackActive) return;
        
        const response = await fetch(`${POLLING_URL}?since=${lastTimestamp}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Polling endpoint no longer available, switching to periodic refresh');
            setupPeriodicRefresh();
            return;
          }
          throw new Error('Polling request failed');
        }
        
        const data = await response.json();
        setLastTimestamp(data.timestamp);
        
        if (data.updates && data.updates.length > 0) {
          console.log(`Received ${data.updates.length} updates via polling`);
          
          // Process updates
          data.updates.forEach(update => {
            if (update.type === 'newMeme') {
              fetchMemes();
            } else if (update.type === 'memeUpdated') {
              setMemes(prevMemes => 
                prevMemes.map(meme => 
                  meme.id === update.data.id ? update.data : meme
                )
              );
            }
          });
        }
      } catch (error) {
        console.log('Error during polling, will retry');
      }
    };
    
    // Clean up on unmount
    return () => {
      clearTimeout(connectionTimeout);
      
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [lastTimestamp, usingPolling, refreshFallbackActive]);
  
  // Initial fetch of memes
  useEffect(() => {
    fetchMemes();
    
    // If we're using the simple refresh fallback, set up the interval
    if (refreshFallbackActive) {
      setupPeriodicRefresh();
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [sortBy, timeFilter, refreshFallbackActive]);
  
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
      // Create params for filtering
      const params = {};
      
      // Add time filter if not "all"
      if (timeFilter !== 'all') {
        params.time = timeFilter;
      }
      
      // Add sort parameter
      params.sort = sortBy;
      
      // Create URL for filtered memes
      let url;
      
      // Check if filteredMemes helper is available in the API_ENDPOINTS
      if (typeof API_ENDPOINTS.filteredMemes === 'function') {
        url = API_ENDPOINTS.filteredMemes(params);
      } else {
        // Fallback to manual URL construction
        url = API_ENDPOINTS.memes;
        const queryParams = new URLSearchParams();
        
        if (timeFilter !== 'all') {
          queryParams.append('time', timeFilter);
        }
        
        queryParams.append('sort', sortBy);
        
        if (queryParams.toString()) {
          url = `${url}?${queryParams.toString()}`;
        }
      }
      
      console.log(`Fetching memes with time filter: ${timeFilter}, sort: ${sortBy}`);
      console.log(`API URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch memes');
      }
      
      const data = await response.json();
      console.log(`Received ${data.length} memes from server`);
      
      // Log sample data for debugging
      if (data.length > 0) {
        const sampleMeme = data[0];
        console.log('Sample meme:', {
          id: sampleMeme.id,
          created_at: sampleMeme.created_at,
          votes: sampleMeme.votes || 0,
          message: sampleMeme.message?.substring(0, 20) + '...'
        });
      }
      
      // Only fetch comment counts if sorting by comments since we need to reorder
      // For other sort modes, we'll use the server's ordering
      let sortedData = data;
      
      if (sortBy === 'commented') {
        try {
          // Create an array of promises for comment fetching
          const commentFetchPromises = data.map(async (meme) => {
            try {
              const commentsResponse = await fetch(API_ENDPOINTS.getComments(meme.id), {
                headers: {
                  'user-id': localStorage.getItem('memeUser') ? JSON.parse(localStorage.getItem('memeUser')).uid : null
                }
              });
              
              if (!commentsResponse.ok) {
                console.log(`Non-OK response for meme ${meme.id} comments: ${commentsResponse.status}`);
                return { ...meme, commentCount: 0 };
              }
              
              const comments = await commentsResponse.json();
              return { ...meme, commentCount: Array.isArray(comments) ? comments.length : 0 };
            } catch (error) {
              console.error(`Error fetching comments for meme ${meme.id}:`, error);
              return { ...meme, commentCount: 0 };
            }
          });
          
          // Wait for all promises to resolve with a timeout
          const results = await Promise.all(
            commentFetchPromises.map(promise => 
              Promise.race([
                promise, 
                new Promise(resolve => setTimeout(() => resolve({ commentCount: 0 }), 3000))
              ])
            )
          );
          
          // Merge results back with original data
          const memesWithCommentCounts = data.map((meme, index) => {
            const result = results[index];
            return { ...meme, commentCount: result && result.commentCount ? result.commentCount : 0 };
          });
          
          // Sort by comment count
          sortedData = [...memesWithCommentCounts].sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        } catch (error) {
          console.error('Error fetching comment counts:', error);
        }
      }
      
      // Show only first 8 memes
      setMemes(sortedData.slice(0, 8));
    } catch (error) {
      console.error('Error fetching memes:', error);
      setMemes([]); // Set empty array to show the "No memes found" message
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