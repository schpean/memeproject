import React from 'react';
import '../styles/Legal.css';

function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Terms of Service</h1>
        <div className="legal-content">
          <p className="legal-intro">
            Welcome to bossme.me! These Terms of Service govern your use of our website. 
            By accessing or using our services, you agree to be bound by these terms.
          </p>
          
          <div className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              This section will contain the introductory information about the terms of service.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>2. User Accounts</h2>
            <p>
              This section will explain the terms related to user accounts.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>3. Content Guidelines</h2>
            <p>
              This section will outline what content is and isn't allowed on the platform.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>4. Intellectual Property</h2>
            <p>
              This section will explain intellectual property rights.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>5. Termination</h2>
            <p>
              This section will explain when and how user accounts may be terminated.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>6. Limitation of Liability</h2>
            <p>
              This section will explain the limits of the site's liability.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>7. Changes to Terms</h2>
            <p>
              This section will explain how and when the terms may be updated.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us.
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

export default Terms; 