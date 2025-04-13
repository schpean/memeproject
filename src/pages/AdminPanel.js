import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../utils/config';
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import './styles/AdminPanel.css';

// CSV export helper function
const exportToCsv = (data, filename) => {
  // Define CSV headers based on data
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]).filter(key => 
    // Exclude sensitive fields if necessary
    !['password', 'password_hash', 'reset_token', 'verification_token'].includes(key)
  );
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // CSV header row
    ...data.map(row => 
      headers.map(header => {
        // Format cell data - wrap in quotes and escape any quotes inside
        let cellData = row[header] === null ? '' : String(row[header]);
        
        // Format dates
        if (header.includes('date') || header.includes('login') || header.includes('created')) {
          try {
            if (cellData) {
              cellData = new Date(cellData).toLocaleString();
            }
          } catch (e) {
            // Keep original if date parsing fails
          }
        }
        
        // Escape quotes and wrap in quotes
        return `"${cellData.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminPanel = () => {
  const { currentUser, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  
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
        setFilteredUsers(usersData);
        
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
  
  // Filter users based on search term and role filter
  useEffect(() => {
    if (!users.length) return;
    
    let result = [...users];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.username.toLowerCase().includes(searchLower) || 
        user.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      const roleId = parseInt(filterRole, 10);
      result = result.filter(user => user.role_id === roleId);
    }
    
    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, filterRole, users]);
  
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
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, role_id: roleId, role: roles.find(r => r.id === roleId)?.name }
          : user
      );
      
      setUsers(updatedUsers);
      
      // Also update filtered users
      setFilteredUsers(prevFiltered => 
        prevFiltered.map(user => 
          user.id === userId 
            ? { ...user, role_id: roleId, role: roles.find(r => r.id === roleId)?.name }
            : user
        )
      );
      
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
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle role filter change
  const handleFilterChange = (e) => {
    setFilterRole(e.target.value);
  };
  
  // Handle changing results per page
  const handleResultsPerPageChange = (e) => {
    setUsersPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1); // Reset to first page when changing results per page
  };
  
  // Export current filtered users as CSV
  const handleExportCsv = () => {
    setExportLoading(true);
    try {
      // Prepare export data with role names instead of IDs
      const exportData = filteredUsers.map(user => ({
        ...user,
        role: roles.find(r => r.id === user.role_id)?.name || 'Unknown'
      }));
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bossme-users-${timestamp}.csv`;
      
      exportToCsv(exportData, filename);
      setSuccessMessage(`Successfully exported ${exportData.length} users to CSV`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(`Failed to export CSV: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };
  
  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Handle page navigation
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
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
        
        <div className="admin-controls">
          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by username or email"
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
            </div>
            
            <div className="filter-container">
              <FaFilter className="filter-icon" />
              <select 
                value={filterRole} 
                onChange={handleFilterChange}
                className="role-filter"
              >
                <option value="all">All Roles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleExportCsv} 
              disabled={exportLoading || filteredUsers.length === 0}
              className="export-button"
            >
              <FaDownload /> {exportLoading ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          
          <div className="pagination-controls">
            <span>
              Showing {filteredUsers.length ? indexOfFirstUser + 1 : 0}-
              {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
            </span>
            <select 
              value={usersPerPage} 
              onChange={handleResultsPerPageChange}
              className="results-per-page"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>
        
        <div className="user-list">
          {filteredUsers.length === 0 ? (
            <div className="no-results">
              <p>No users match your search criteria.</p>
            </div>
          ) : (
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
                {currentUsers.map(user => (
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
                      <div className="action-buttons">
                        <button 
                          className="view-button"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {filteredUsers.length > 0 && (
            <div className="pagination">
              <button 
                onClick={prevPage} 
                disabled={currentPage === 1}
                className="pagination-button"
              >
                <FaChevronLeft /> Prev
              </button>
              
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={nextPage} 
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
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