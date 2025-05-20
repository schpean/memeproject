import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieBanner.css';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Verificăm dacă utilizatorul a acceptat deja cookie-urile
    const cookieConsent = localStorage.getItem('cookieConsent');
    
    // Afișăm banner-ul doar dacă utilizatorul nu a dat consimțământul anterior
    if (!cookieConsent) {
      // Întârziere mică pentru a nu afișa banner-ul imediat la încărcarea paginii
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    // Salvăm consimțământul în localStorage
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const declineCookies = () => {
    // Salvăm refuzul în localStorage și dezactivăm cookie-urile non-esențiale
    localStorage.setItem('cookieConsent', 'declined');
    // Aici ar trebui să existe logica pentru dezactivarea cookie-urilor non-esențiale
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <h3>Folosim cookie-uri</h3>
        <p>
          Utilizăm cookie-uri și tehnologii similare pentru a îmbunătăți experiența ta de navigare, 
          a personaliza conținutul și a oferi funcționalitatea de bază a site-ului. 
          Continuarea navigării pe site-ul nostru reprezintă acordul tău pentru utilizarea acestor cookie-uri.
          Mai multe detalii în <Link to="/privacy">Politica de Confidențialitate</Link> și <Link to="/cookies">Politica de Cookie-uri</Link>.
        </p>
        <div className="cookie-actions">
          <button className="cookie-btn accept" onClick={acceptCookies}>
            Accept tot
          </button>
          <button className="cookie-btn decline" onClick={declineCookies}>
            Doar esențiale
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner; 