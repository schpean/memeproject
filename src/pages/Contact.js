import React from 'react';
import '../styles/Legal.css';

function Contact() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Contact Us</h1>
        <div className="legal-content">
          <p className="legal-intro">
            Have questions, suggestions, or feedback? We'd love to hear from you!
            Below you'll find multiple ways to get in touch with our team.
          </p>
          
          <div className="legal-section">
            <h2>1. General Inquiries</h2>
            <p>
              For general questions about bossme.me, you can email us at contact@bossme.me.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>2. Technical Support</h2>
            <p>
              If you're experiencing technical issues or have questions about how to use the platform,
              please email support@bossme.me.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>3. Report Issues</h2>
            <p>
              To report inappropriate content or behavior, please email moderation@bossme.me with details 
              about the issue.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>4. Business Partnerships</h2>
            <p>
              For partnership opportunities or business inquiries, please contact business@bossme.me.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>5. Social Media</h2>
            <p>
              Connect with us on social media:
            </p>
            <ul>
              <li>Twitter: <a href="#twitter">@bossmememe</a></li>
              <li>Instagram: <a href="#instagram">@bossmeme</a></li>
            </ul>
          </div>
          
          <div className="legal-section">
            <h2>6. Response Time</h2>
            <p>
              We strive to respond to all inquiries within 48 hours during business days. Complex issues
              may require additional time to investigate and resolve.
            </p>
          </div>
          
          <div className="legal-section">
            <h2>7. Feedback</h2>
            <p>
              We value your feedback! If you have suggestions for improving our platform, please
              send them to feedback@bossme.me.
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

export default Contact; 