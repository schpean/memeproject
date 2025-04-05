import React from 'react';
import { Link } from 'react-router-dom';
import './CompanySection.css';

const CompanySection = ({ companies }) => {
  return (
    <div className="companies-section">
      <h2 className="section-title">Browse by Company</h2>
      <div className="companies-grid">
        {companies.map(company => (
          <Link 
            key={company} 
            to={`/company/${company}`} 
            className="company-card"
          >
            {/* Optional company icon/logo could go here */}
            <span className="company-name">{company}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CompanySection;