import React from 'react';
import '../styles/Legal.css';

function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Privacy Policy</h1>
        <div className="legal-content">
          <p className="legal-intro">
            At bossme.me, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, and protect your personal information when you use our website.
          </p>
          
          <div className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>
              This section will explain what information we collect from users.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>
              This section will explain how we use the collected information.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>3. Cookies and Tracking Technologies</h2>
            <p>
              This section will explain our use of cookies and similar technologies.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>4. Data Security</h2>
            <p>
              This section will explain how we protect user data.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>5. Third-Party Services</h2>
            <p>
              This section will explain how third-party services may access user data.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>6. User Rights</h2>
            <p>
              This section will explain the rights users have regarding their data.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>7. Changes to Privacy Policy</h2>
            <p>
              This section will explain how and when the privacy policy may be updated.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about our Privacy Policy, please contact us.
            </p>
          </div>
        </div>
        
        <div className="legal-footer">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export default Privacy; 