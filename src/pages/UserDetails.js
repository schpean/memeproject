import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/config';
import { notify } from '../components/common/Notification';
import './styles/UserDetails.css';
import useConfirmDialog from '../hooks/useConfirmDialog';
import ConfirmDialog from '../components/ConfirmDialog';

const UserDetails = () => {
  const { id } = useParams();
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Folosim hook-ul pentru dialog în loc de starea locală pentru confirmare
  const { isOpen, dialogConfig, confirmDialog, closeDialog } = useConfirmDialog();

  // Verifică dacă este o cerere directă pentru anonimizare
  useEffect(() => {
    if (location.hash === '#danger-zone') {
      // Facem scroll la secțiunea de danger zone
      setTimeout(() => {
        const element = document.getElementById('danger-zone');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          
          // Afișăm dialogul de confirmare direct
          handleDeleteUser();
        }
      }, 100);
    }
  }, [location]);

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!currentUser || !isAdmin) {
        navigate('/');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(API_ENDPOINTS.userStats(id), {
          headers: {
            'user-id': currentUser.uid,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch user stats: ${response.status}`);
        }
        
        const stats = await response.json();
        setUserStats(stats);
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError('Failed to load user statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [currentUser, id, isAdmin, navigate]);

  // Handle user deletion
  const handleDeleteUser = async () => {
    // Afișăm dialogul de confirmare
    const confirmed = await confirmDialog({
      title: 'Ștergere utilizator',
      message: 'Ești sigur? Această acțiune va anonimiza contul utilizatorului și îl va marca ca șters. Meme-urile și comentariile utilizatorului vor rămâne, dar vor apărea sub un nume anonim.',
      confirmText: 'Da, șterge și banează userul',
      cancelText: 'Anulează',
      confirmButtonClass: 'danger',
      icon: 'warning'
    });
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.deleteUser(id), {
        method: 'DELETE',
        headers: {
          'user-id': currentUser.uid
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`);
      }
      
      const result = await response.json();
      notify(result.message || 'User successfully deleted', 'success');
      
      // Redirect back to admin panel
      navigate('/admin');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
      notify('Failed to delete user', 'error');
      
      // Afișăm dialog de eroare
      confirmDialog({
        title: 'Eroare',
        message: 'Nu s-a putut șterge utilizatorul. Încercați din nou.',
        confirmText: 'OK',
        cancelText: '',
        confirmButtonClass: 'primary',
        icon: 'warning',
        onCancel: closeDialog
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  if (loading) {
    return <div className="user-details loading">Loading user data...</div>;
  }
  
  if (error) {
    return (
      <div className="user-details error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/admin" className="back-button">Back to Admin Panel</Link>
      </div>
    );
  }
  
  if (!userStats) {
    return (
      <div className="user-details error">
        <h2>User Not Found</h2>
        <p>The requested user could not be found.</p>
        <Link to="/admin" className="back-button">Back to Admin Panel</Link>
      </div>
    );
  }
  
  const { user, meme_count, total_votes, memes } = userStats;
  
  return (
    <>
      <div className="user-details">
        <div className="header-actions">
          <h1>User Details</h1>
          <Link to="/admin" className="back-button">Back to Admin Panel</Link>
        </div>
        
        <div className="user-card">
          <h2>{user.username}'s Profile</h2>
          <div className="user-info">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Created:</strong> {formatDate(user.created_at)}</p>
            <p><strong>Last Login:</strong> {formatDate(user.last_login)}</p>
          </div>
        </div>
        
        <div className="stats-card">
          <h2>User Statistics</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-value">{meme_count}</span>
              <span className="stat-label">Total Memes</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{total_votes}</span>
              <span className="stat-label">Total Upvotes</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{meme_count ? (total_votes / meme_count).toFixed(1) : '0'}</span>
              <span className="stat-label">Avg. Votes per Meme</span>
            </div>
          </div>
        </div>
        
        {memes.length > 0 && (
          <div className="memes-card">
            <h2>User's Memes</h2>
            <table className="memes-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Created</th>
                  <th>Votes</th>
                  <th>Status</th>
                  <th>Who</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memes.map(meme => (
                  <tr key={meme.id}>
                    <td>{meme.title || 'Untitled Meme'}</td>
                    <td>{formatDate(meme.created_at)}</td>
                    <td>{meme.votes || 0}</td>
                    <td>{meme.approval_status}</td>
                    <td>
                      {(meme.approval_status === 'approved' || meme.approval_status === 'rejected') 
                        ? (meme.approved_by_username ? meme.approved_by_username : 'N/A') 
                        : '-'}
                    </td>
                    <td>
                      <Link to={`/meme/${meme.id}`} className="view-button">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div id="danger-zone" className="danger-zone">
          <h2>Danger Zone</h2>
          <div className="delete-section">
            <p>Utilizatorul poate fi sters si banat, păstrând conținutul său sub un pseudonim.</p>
            
            <button 
              className="delete-button danger-button" 
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? 'Se procesează...' : 'Sterge Utilizatorul'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Adăugăm dialogul de confirmare */}
      <ConfirmDialog
        isOpen={isOpen}
        {...dialogConfig}
      />
    </>
  );
};

export default UserDetails;