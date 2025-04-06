import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/config';
import './styles/AdminPanel.css';

const AdminPanel = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!currentUser || !isAdmin)) {
      navigate('/');
    }
  }, [currentUser, isAdmin, loading, navigate]);
  
  // Fetch users and roles on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch users
        const usersResponse = await fetch(API_ENDPOINTS.adminUsers, {
          headers: {
            'user-id': currentUser.uid
          }
        });
        
        if (!usersResponse.ok) {
          throw new Error(`Failed to fetch users: ${usersResponse.status}`);
        }
        
        const usersData = await usersResponse.json();
        setUsers(usersData);
        
        // Fetch roles
        const rolesResponse = await fetch(API_ENDPOINTS.adminRoles, {
          headers: {
            'user-id': currentUser.uid
          }
        });
        
        if (!rolesResponse.ok) {
          throw new Error(`Failed to fetch roles: ${rolesResponse.status}`);
        }
        
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
        
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser]);
  
  // Update user role
  const updateUserRole = async (userId, roleId) => {
    setError(null);
    setSuccessMessage('');
    
    try {
      const response = await fetch(API_ENDPOINTS.updateUserRole(userId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.uid
        },
        body: JSON.stringify({ roleId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update user role: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update the users list with the new role
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, role_id: roleId, role: roles.find(r => r.id === roleId)?.name }
          : user
      ));
      
      setSuccessMessage(result.message || 'User role updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err.message);
    }
  };
  
  // Handle role change
  const handleRoleChange = (userId, e) => {
    const roleId = parseInt(e.target.value, 10);
    updateUserRole(userId, roleId);
  };
  
  // Add a function to mask email addresses
  const maskEmail = (email) => {
    if (!email) return '';
    
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const [username, domain] = parts;
    
    // Mask username: show first 2 chars and last char, asterisks in between
    let maskedUsername = username;
    if (username.length > 3) {
      maskedUsername = username.substring(0, 2) + 
        '*'.repeat(username.length - 3) + 
        username.substring(username.length - 1);
    }
    
    // Mask domain: show first char of domain name and the TLD (.com, .org, etc.)
    const domainParts = domain.split('.');
    let maskedDomain = domain;
    if (domainParts.length >= 2) {
      const domainName = domainParts[0];
      const tld = domainParts.slice(1).join('.');
      
      maskedDomain = domainName.substring(0, 1) + 
        '*'.repeat(domainName.length - 1) + 
        '.' + tld;
    }
    
    return `${maskedUsername}@${maskedDomain}`;
  };
  
  if (loading) {
    return <div className="admin-panel loading">Loading...</div>;
  }
  
  if (!currentUser || !isAdmin) {
    return <div className="admin-panel error">Access denied</div>;
  }
  
  return (
    <div className="admin-panel">
      <h1>Admin Panel</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}
      
      <section className="admin-section">
        <h2>User Management</h2>
        <p>Total users: {users.length}</p>
        
        <div className="user-list">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{maskEmail(user.email)}</td>
                  <td>
                    <select 
                      value={user.role_id} 
                      onChange={(e) => handleRoleChange(user.id, e)}
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(user.last_login).toLocaleString()}</td>
                  <td>
                    <button 
                      className="view-button"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      <section className="admin-section">
        <h2>Role Management</h2>
        <div className="role-list">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Role Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id}>
                  <td>{role.id}</td>
                  <td>{role.name}</td>
                  <td>{role.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel; 