import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import MemeCard from '../components/meme/MemeCard';

function BrowseMemes() {
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    country: '',
    company: '',
    managerType: ''
  });

  const countries = ['Romania', 'UK', 'Germany', 'France', 'USA'];
  const companies = ['TechCorp', 'MegaRetail', 'CorporateInc', 'StartupXYZ'];
  const managerTypes = ['Micromanager', 'Clueless', 'Ghost', 'Tyrant', 'Passive-Aggressive'];

  useEffect(() => {
    fetchMemes();
  }, [filters]);

  const fetchMemes = async () => {
    setLoading(true);
    
    try {
      let q = query(collection(db, 'memes'));
      
      // Apply filters
      if (filters.country) {
        q = query(q, where('country', '==', filters.country));
      }
      
      if (filters.company) {
        q = query(q, where('company', '==', filters.company));
      }
      
      if (filters.managerType) {
        q = query(q, where('managerType', '==', filters.managerType));
      }
      
      const snapshot = await getDocs(q);
      const memeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMemes(memeList);
    } catch (error) {
      console.error('Error fetching memes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      country: '',
      company: '',
      managerType: ''
    });
  };

  return (
    <div className="browse-memes-page">
      <h1>Browse Manager Rant Memes</h1>
      
      <div className="filters-section">
        <div className="filter-controls">
          <div className="filter-group">
            <label>Country:</label>
            <select 
              name="country" 
              value={filters.country} 
              onChange={handleFilterChange}
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Company:</label>
            <select 
              name="company" 
              value={filters.company} 
              onChange={handleFilterChange}
            >
              <option value="">All Companies</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Manager Type:</label>
            <select 
              name="managerType" 
              value={filters.managerType} 
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              {managerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <button onClick={clearFilters}>Clear Filters</button>
        </div>
      </div>
      
      <div className="memes-grid">
        {loading ? (
          <p>Loading memes...</p>
        ) : memes.length > 0 ? (
          memes.map(meme => (
            <MemeCard key={meme.id} meme={meme} />
          ))
        ) : (
          <p>No memes found matching your filters.</p>
        )}
      </div>
    </div>
  );
}

export default BrowseMemes;