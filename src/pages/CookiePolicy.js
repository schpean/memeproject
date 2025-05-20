import React, { useState } from 'react';
import '../styles/Legal.css';

function CookiePolicy() {
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
        
        <h1>{language === 'en' ? 'Cookie Policy' : 'Politica de Cookie-uri'}</h1>
        
        {language === 'en' ? (
          // Conținut în engleză
          <div className="legal-content">
            <p className="legal-intro">
              This Cookie Policy explains how bossme.me ("we", "us", or "our") uses cookies and similar technologies when you visit our website. By using our website, you consent to the use of cookies as described in this policy.
            </p>
            
            <div className="legal-section">
              <h2>1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit websites. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners information about how their sites are used.
              </p>
              <p>
                Cookies cannot access, read, or modify any other data on your device.
              </p>
              <p>
                In addition to cookies, we also use browser's local storage, which is a similar technology that allows websites to store data on your device in a more persistent way.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. Types of Cookies and Storage Technologies We Use</h2>
              <p>
                We currently use only essential cookies and local storage on our website:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Essential Cookies and Storage:</strong> These are necessary for the website to function properly and cannot be switched off. They are usually set in response to actions you take, such as creating an account, logging in, or setting your cookie preferences.</li>
              </ul>
              <p>
                At present, we do not use non-essential cookies such as analytics, advertising, or tracking cookies. If this changes in the future, we will update this policy and ask for your consent before implementing them.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. Specific Data We Store</h2>
              <p>
                Here is what we currently store in your browser:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Authentication Data:</strong> Used to keep you logged in to your account (stored in local storage).</li>
                <li><strong>Cookie Consent:</strong> Your preferences regarding cookie usage (stored in local storage).</li>
                <li><strong>User Preferences:</strong> Basic settings to improve your experience (stored in local storage).</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>4. Third-Party Cookies</h2>
              <p>
                Currently, we do not include third-party cookies on our website. If we integrate services that use third-party cookies in the future (such as analytics or social media features), we will update this policy and request your consent before implementation.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Managing and Disabling Cookies</h2>
              <p>
                You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site, and some services and functionalities may not work.
              </p>
              <p>
                Most web browsers also allow you to clear local storage and set permissions for websites. The methods for doing so vary from browser to browser, and from version to version. You can obtain up-to-date information about managing cookies and local storage via these links:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>6. Updates to This Cookie Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. Any changes will become effective when we post the revised policy on this page with an updated revision date.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Contact Us</h2>
              <p>
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
              </p>
              <p>
                Email: contact@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>
          </div>
        ) : (
          // Conținut în română
          <div className="legal-content">
            <p className="legal-intro">
              Această Politică de Cookie-uri explică modul în care bossme.me („noi", „nouă" sau „nostru") utilizează cookie-uri și tehnologii similare când vizitezi website-ul nostru. Prin utilizarea website-ului nostru, ești de acord cu utilizarea cookie-urilor așa cum este descris în această politică.
            </p>
            
            <div className="legal-section">
              <h2>1. Ce Sunt Cookie-urile?</h2>
              <p>
                Cookie-urile sunt fișiere text mici care sunt stocate pe dispozitivul tău (calculator, tabletă sau mobil) atunci când vizitezi site-uri web. Ele sunt utilizate pe scară largă pentru a face site-urile web să funcționeze mai eficient, pentru a oferi o experiență de utilizare mai bună și pentru a furniza proprietarilor de site-uri web informații despre modul în care sunt utilizate site-urile lor.
              </p>
              <p>
                Cookie-urile nu pot accesa, citi sau modifica alte date de pe dispozitivul tău.
              </p>
              <p>
                Pe lângă cookie-uri, utilizăm și local storage (stocarea locală) a browserului, care este o tehnologie similară ce permite site-urilor web să stocheze date pe dispozitivul tău într-un mod mai persistent.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. Tipuri de Cookie-uri și Tehnologii de Stocare pe Care le Folosim</h2>
              <p>
                În prezent, folosim doar cookie-uri esențiale și local storage pe website-ul nostru:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Cookie-uri și Stocare Esențiale:</strong> Acestea sunt necesare pentru ca website-ul să funcționeze corect și nu pot fi dezactivate. Ele sunt de obicei setate ca răspuns la acțiunile tale, cum ar fi crearea unui cont, autentificarea sau setarea preferințelor tale pentru cookie-uri.</li>
              </ul>
              <p>
                În prezent, nu folosim cookie-uri non-esențiale cum ar fi cookie-uri de analiză, publicitate sau urmărire. Dacă acest lucru se va schimba în viitor, vom actualiza această politică și vom cere consimțământul tău înainte de a le implementa.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. Date Specifice pe Care le Stocăm</h2>
              <p>
                Iată ce stocăm în prezent în browserul tău:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Date de Autentificare:</strong> Utilizate pentru a te menține conectat la contul tău (stocate în local storage).</li>
                <li><strong>Consimțământ pentru Cookie-uri:</strong> Preferințele tale privind utilizarea cookie-urilor (stocate în local storage).</li>
                <li><strong>Preferințe Utilizator:</strong> Setări de bază pentru a-ți îmbunătăți experiența (stocate în local storage).</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>4. Cookie-uri ale Terților</h2>
              <p>
                În prezent, nu includem cookie-uri ale terților pe website-ul nostru. Dacă vom integra servicii care utilizează cookie-uri ale terților în viitor (cum ar fi funcții de analiză sau social media), vom actualiza această politică și vom solicita consimțământul tău înainte de implementare.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Gestionarea și Dezactivarea Cookie-urilor</h2>
              <p>
                Poți controla și/sau șterge cookie-urile după cum dorești. Poți șterge toate cookie-urile care sunt deja pe calculatorul tău și poți seta majoritatea browserelor pentru a împiedica plasarea acestora. Cu toate acestea, dacă faci acest lucru, este posibil să trebuiască să ajustezi manual unele preferințe de fiecare dată când vizitezi un site, iar unele servicii și funcționalități pot să nu funcționeze.
              </p>
              <p>
                Majoritatea browserelor web îți permit și să ștergi local storage și să setezi permisiunile pentru site-uri web. Metodele pentru a face acest lucru variază de la browser la browser și de la versiune la versiune. Poți obține informații actualizate despre gestionarea cookie-urilor și a stocării locale prin intermediul acestor linkuri:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                <li><a href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>6. Actualizări ale Acestei Politici de Cookie-uri</h2>
              <p>
                Este posibil să actualizăm această Politică de Cookie-uri din când în când pentru a reflecta schimbările în tehnologie, reglementări sau practicile noastre de afaceri. Orice modificări vor intra în vigoare când publicăm politica revizuită pe această pagină, cu o dată de revizuire actualizată.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Contactează-ne</h2>
              <p>
                Dacă ai întrebări despre utilizarea cookie-urilor sau despre această Politică de Cookie-uri, te rugăm să ne contactezi la:
              </p>
              <p>
                Email: contact@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>
          </div>
        )}
        
        <div className="legal-footer">
          <p>{language === 'en' ? 'Last updated' : 'Ultima actualizare'}: 15 May 2024</p>
        </div>
      </div>
    </div>
  );
}

export default CookiePolicy; 