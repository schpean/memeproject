import React, { useState } from 'react';
import '../styles/Legal.css';

function Contact() {
  const [language, setLanguage] = useState('en'); // 'en' pentru engleză, 'ro' pentru română

  // Handler pentru schimbarea limbii
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ro' : 'en');
  };

  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="language-toggle">
          <button onClick={toggleLanguage} className="language-button">
            {language === 'en' ? 'Schimbă în Română' : 'Switch to English'}
          </button>
        </div>
        
        <h1>Contact Us</h1>
        
        {language === 'en' ? (
          // Conținut în engleză
          <div className="legal-content">
            <p className="legal-intro">
              Whether you have questions, feedback, or partnership ideas, we're here to help. Please email us at:
            </p>
            
            <div className="contact-method" style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
                ✉️ contact@bossme.me
              </p>
            </div>
            
            <p className="legal-intro">
              We aim to respond within 48 business hours.
            </p>
          </div>
        ) : (
          // Conținut în română
          <div className="legal-content">
            <p className="legal-intro">
              Indiferent dacă ai întrebări, feedback sau idei de parteneriat, suntem aici pentru a te ajuta. Te rugăm să ne contactezi pe email la:
            </p>
            
            <div className="contact-method" style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>
                ✉️ contact@bossme.me
              </p>
            </div>
            
            <p className="legal-intro">
              Încercăm să răspundem în maximum 48 de ore lucrătoare.
            </p>
          </div>
        )}
        
        <div className="legal-footer">
          <p>{language === 'en' ? 'Last updated' : 'Ultima actualizare'}: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export default Contact; 