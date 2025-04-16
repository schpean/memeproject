import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaPlus, FaCheck, FaTimes, FaHourglassHalf } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { memeApi } from '../api/api';
import MemeCard from '../components/meme/MemeCard';
import './styles/MyMemes.css';

const MyMemes = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMemes = async () => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        const userMemes = await memeApi.getUserMemes();
        setMemes(userMemes);
      } catch (err) {
        console.error('Error fetching user memes:', err);
        setError('Could not load your memes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemes();
  }, [currentUser]);

  // If user is not authenticated, redirect to home page
  if (!authLoading && !currentUser) {
    return <Navigate to="/" replace />;
  }

  // Render the meme status
  const renderStatus = (meme) => {
    const status = meme.approval_status || 'pending';

    switch (status) {
      case 'approved':
        return <span className="status-tag status-approved"><FaCheck /> Approved</span>;
      case 'rejected':
        return <span className="status-tag status-rejected"><FaTimes /> Rejected</span>;
      case 'pending':
      default:
        return <span className="status-tag status-pending"><FaHourglassHalf /> Pending</span>;
    }
  };

  // Display rejection reason if the meme was rejected
  const renderRejectionReason = (meme) => {
    if (meme.approval_status === 'rejected' && meme.rejection_reason) {
      return (
        <div className="rejection-reason">
          <strong>Rejection Reason:</strong> {meme.rejection_reason}
        </div>
      );
    }
    return null;
  };

  // Add approval information if the meme was approved
  const renderApprovalInfo = (meme) => {
    if (meme.approval_status === 'approved' && meme.approved_at) {
      return (
        <div className="approval-info">
          <strong>Approved by:</strong> {meme.approved_by_username || 'N/A'} at {new Date(meme.approved_at).toLocaleString()}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="my-memes">
      <h1>My memes</h1>

      {loading ? (
        <div className="loading">Loading your memes...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          {memes.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any memes yet.</p>
              <Link to="/howto" className="create-meme-btn">
                <FaPlus /> Create a meme
              </Link>
            </div>
          ) : (
            <div className="my-memes-container">
              {memes.map(meme => (
                <div key={meme.id} className="meme-wrapper">
                  <div className="meme-header-status">
                    {renderStatus(meme)}
                  </div>
                  <MemeCard 
                    meme={meme} 
                    showApprovalStatus={false} 
                  />
                  {renderRejectionReason(meme)}
                  {renderApprovalInfo(meme)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyMemes; 