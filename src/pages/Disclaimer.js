import React from 'react';
import '../styles/Legal.css';

function Disclaimer() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Disclaimer</h1>
        <div className="legal-content">
          <p className="legal-intro">
            This disclaimer outlines the limitations of liability and responsibilities 
            for the content and services provided by bossme.me.
          </p>
          
          <div className="legal-section">
            <h2>1. Content Accuracy</h2>
            <p>
              This section will explain our stance on the accuracy of user-generated content.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>2. User Responsibilities</h2>
            <p>
              This section will explain user responsibilities regarding content they post.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>3. External Links</h2>
            <p>
              This section will explain our policy on external links posted on the site.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>4. No Professional Advice</h2>
            <p>
              This section will clarify that content on the site does not constitute professional advice.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>5. Indemnification</h2>
            <p>
              This section will explain user indemnification obligations.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>6. Limitation of Liability</h2>
            <p>
              This section will explain limitations of liability for site operators.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>7. Changes to Disclaimer</h2>
            <p>
              This section will explain how and when the disclaimer may be updated.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about this Disclaimer, please contact us.
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

export default Disclaimer; 