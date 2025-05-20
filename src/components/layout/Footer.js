import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Verificăm dacă suntem pe partea client
    if (typeof window === 'undefined') return;

    // Dezactivăm temporar butonul existent dacă există
    const existingButton = document.querySelector('.bmc-button');
    if (existingButton) {
      existingButton.style.display = 'none';
    }

    // Eliminăm orice script existent pentru a evita duplicări
    const existingScript = document.getElementById('buymeacoffee-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Funcție pentru a crea butonul după un mic delay
    const createButton = () => {
      setTimeout(() => {
        if (window.BmcButton) {
          try {
            const bmcBtn = new window.BmcButton();
            bmcBtn.init({
              uuid: 'bossme.me',
              element: {
                id: 'bmc-button-container',
              },
              position: 'right',
              color: '#AD8B73',
              emoji: '☕',
              font: 'Nunito',
              text: 'Buy me a coffee',
              outline_color: '#5E4B3B',
              font_color: '#FFFFFF',
              coffee_color: '#E3CAA5'
            });
            setScriptLoaded(true);
          } catch (error) {
            console.error("Eroare la inițializarea butonului BMC:", error);
            // Păstrăm butonul static vizibil în caz de eroare
            setScriptLoaded(false);
          }
        }
      }, 300); // Delay mic pentru a permite DOM-ului să se stabilizeze
    };

    // Încărcăm scriptul
    const script = document.createElement('script');
    script.id = 'buymeacoffee-script';
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';
    script.async = true;
    script.onload = createButton;
    script.onerror = () => {
      console.error("Scriptul BMC nu s-a putut încărca");
      setScriptLoaded(false); // Păstrăm butonul static vizibil
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup la unmount
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Partea stângă - Copyright */}
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} bossme.me</p>
          </div>
          
          {/* Partea centrală - Link-uri */}
          <div className="footer-links">
            <ul className="footer-nav">
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/disclaimer">Disclaimer</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          
          {/* Partea dreaptă - Butonul Buy me a coffee */}
          <div className="buy-me-coffee">
            {/* Container pentru butonul dinamic */}
            <div id="bmc-button-container"></div>
            
            {/* Buton static de rezervă, mereu vizibil */}
            <a 
              href="https://www.buymeacoffee.com/bossme.me" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bmc-fallback-button"
              style={{ display: scriptLoaded ? 'none' : 'inline-flex', whiteSpace: 'nowrap' }}
            >
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;