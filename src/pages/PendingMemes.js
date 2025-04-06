import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MemeCard from '../components/meme/MemeCard';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/config';
import './styles/PendingMemes.css';

const PendingMemes = () => {
  const { currentUser, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const [pendingMemes, setPendingMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Redirect if user is not admin or moderator
  useEffect(() => {
    if (!loading && (!currentUser || (!isAdmin && !isModerator))) {
      navigate('/');
    }
  }, [currentUser, isAdmin, isModerator, loading, navigate]);
  
  // Fetch pending memes
  useEffect(() => {
    const fetchPendingMemes = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(API_ENDPOINTS.pendingMemes, {
          headers: {
            'user-id': currentUser.uid
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setPendingMemes(data);
      } catch (err) {
        console.error('Error fetching pending memes:', err);
        setError(err.message || 'Failed to load pending memes');
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser && (isAdmin || isModerator)) {
      fetchPendingMemes();
    }
  }, [currentUser, isAdmin, isModerator]);
  
  // Handle meme approval/rejection
  const handleMemeUpdate = (updatedMeme) => {
    if (updatedMeme.approval_status === 'pending') {
      // Update meme in the list
      setPendingMemes(pendingMemes.map(meme => 
        meme.id === updatedMeme.id ? updatedMeme : meme
      ));
    } else {
      // Remove from pending list if approved or rejected
      setPendingMemes(pendingMemes.filter(meme => meme.id !== updatedMeme.id));
    }
  };
  
  if (loading) {
    return <div className="pending-memes loading">Loading pending memes...</div>;
  }
  
  if (error) {
    return <div className="pending-memes error">Error: {error}</div>;
  }
  
  if (!currentUser || (!isAdmin && !isModerator)) {
    return <div className="pending-memes error">Access denied</div>;
  }
  
  return (
    <div className="pending-memes">
      <h1>Pending Memes for Approval</h1>
      
      {pendingMemes.length === 0 ? (
        <div className="no-pending-memes">
          <p>No memes awaiting approval. Good job! 👍</p>
        </div>
      ) : (
        <>
          <p>{pendingMemes.length} meme{pendingMemes.length !== 1 ? 's' : ''} waiting for approval</p>
          
          <div className="pending-memes-list">
            {pendingMemes.map(meme => (
              <MemeCard 
                key={meme.id} 
                meme={meme} 
                onVote={handleMemeUpdate} 
                showApprovalStatus={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PendingMemes; 