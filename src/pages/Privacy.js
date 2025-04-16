import React, { useState } from 'react';
import '../styles/Legal.css';

function Privacy() {
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
        
        <h1>{language === 'en' ? 'Privacy Policy' : 'Politica de Confidențialitate'}</h1>
        
        {language === 'en' ? (
          // Conținut în engleză
          <div className="legal-content">
            <p className="legal-intro">
              At bossme.me, we value your privacy. This Privacy Policy outlines the types of personal information we collect, how we use it, your rights as a user, and how we safeguard your data when you use our platform.
            </p>
            
            <div className="legal-section">
              <h2>1. Information We Collect</h2>
              <p>
                We may collect the following types of information:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Information you provide: such as your email address, username, and content you upload (e.g., memes, comments).</li>
                <li>Automatically collected data: including your IP address, browser type, operating system, pages visited, date and time of access.</li>
                <li>Cookies and tracking data: used to enhance user experience and site functionality.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Provide and maintain the platform;</li>
                <li>Personalize user experience;</li>
                <li>Respond to user requests or reports;</li>
                <li>Monitor usage, prevent abuse, and ensure security;</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>3. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar technologies to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Remember your preferences;</li>
                <li>Analyze site traffic and user behavior;</li>
                <li>Deliver relevant and customized content.</li>
              </ul>
              <p>
                You can control or disable cookies through your browser settings. For more details, refer to our Cookie Policy.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, loss, or disclosure. However, no method of transmission or storage online is entirely secure.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Third-Party Services</h2>
              <p>
                We may work with third-party service providers for hosting, analytics, or other operational needs. These providers may access limited data only to perform their tasks on our behalf and are contractually bound to protect your privacy.
              </p>
              <p>
                We do not sell your personal information to third parties.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. User Rights</h2>
              <p>
                Under the GDPR and other applicable laws, you have the right to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Access your personal data;</li>
                <li>Correct or update your information;</li>
                <li>Request deletion of your data ("right to be forgotten");</li>
                <li>Object to data processing;</li>
                <li>Request restriction of processing;</li>
                <li>File a complaint with the appropriate data protection authority (e.g., ANSPDCP in Romania).</li>
              </ul>
              <p>
                To exercise these rights, contact us at: privacy@bossme.me
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the bottom of this document and notify users of significant changes via email or on the platform. Continued use of the platform after changes indicates your acceptance of the revised policy.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Contact Information</h2>
              <p>
                If you have any questions about this Privacy Policy or your data, please contact us at:<br />
                Email: privacy@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>
          </div>
        ) : (
          // Conținut în română
          <div className="legal-content">
            <p className="legal-intro">
              La bossme.me, apreciem confidențialitatea ta. Această Politică de Confidențialitate descrie tipurile de informații personale pe care le colectăm, cum le folosim, drepturile tale ca utilizator și cum îți protejăm datele atunci când folosești platforma noastră.
            </p>
            
            <div className="legal-section">
              <h2>1. Informațiile pe care le colectăm</h2>
              <p>
                Este posibil să colectăm următoarele tipuri de informații:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Informații pe care le furnizezi: cum ar fi adresa ta de email, numele de utilizator și conținutul pe care îl încarci (de exemplu, meme-uri, comentarii);</li>
                <li>Date colectate automat: inclusiv adresa ta IP, tipul browserului, sistemul de operare, paginile vizitate, data și ora accesului;</li>
                <li>Cookie-uri și date de urmărire: utilizate pentru a îmbunătăți experiența utilizatorului și funcționalitatea site-ului.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>2. Cum folosim informațiile tale</h2>
              <p>
                Folosim informațiile pe care le colectăm pentru a:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Furniza și menține platforma;</li>
                <li>Personaliza experiența utilizatorului;</li>
                <li>Răspunde solicitărilor sau rapoartelor utilizatorilor;</li>
                <li>Monitoriza utilizarea, preveni abuzul și asigura securitatea;</li>
                <li>Respecta obligațiile legale.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>3. Cookie-uri și tehnologii de urmărire</h2>
              <p>
                Folosim cookie-uri și tehnologii similare pentru a:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Memora preferințele tale;</li>
                <li>Analiza traficul site-ului și comportamentul utilizatorilor;</li>
                <li>Furniza conținut relevant și personalizat.</li>
              </ul>
              <p>
                Poți controla sau dezactiva cookie-urile prin setările browserului tău. Pentru mai multe detalii, consultă Politica noastră privind Cookie-urile.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. Securitatea datelor</h2>
              <p>
                Implementăm măsuri tehnice și organizaționale adecvate pentru a proteja datele tale personale împotriva accesului neautorizat, pierderii sau divulgării. Cu toate acestea, nicio metodă de transmitere sau stocare online nu este complet sigură.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Servicii terțe</h2>
              <p>
                Este posibil să colaborăm cu furnizori de servicii terți pentru găzduire, analiză sau alte necesități operaționale. Acești furnizori pot accesa date limitate doar pentru a-și îndeplini sarcinile în numele nostru și sunt obligați contractual să îți protejeze confidențialitatea.
              </p>
              <p>
                Nu vindem informațiile tale personale către terți.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. Drepturile utilizatorilor</h2>
              <p>
                În conformitate cu GDPR și alte legi aplicabile, ai dreptul să:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Accesezi datele tale personale;</li>
                <li>Corectezi sau actualizezi informațiile tale;</li>
                <li>Soliciți ștergerea datelor tale ("dreptul de a fi uitat");</li>
                <li>Te opui prelucrării datelor;</li>
                <li>Soliciți restricționarea prelucrării;</li>
                <li>Depui o plângere la autoritatea competentă de protecție a datelor (de exemplu, ANSPDCP în România).</li>
              </ul>
              <p>
                Pentru a-ți exercita aceste drepturi, contactează-ne la: privacy@bossme.me
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Modificări ale acestei Politici de Confidențialitate</h2>
              <p>
                Este posibil să actualizăm această Politică de Confidențialitate periodic. Când facem acest lucru, vom revizui data "Ultima actualizare" din partea de jos a acestui document și vom notifica utilizatorii despre modificările semnificative prin e-mail sau pe platformă. Utilizarea continuă a platformei după modificări indică acceptarea politicii revizuite.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Informații de contact</h2>
              <p>
                Dacă ai întrebări despre această Politică de Confidențialitate sau despre datele tale, te rugăm să ne contactezi la:<br />
                Email: privacy@bossme.me<br />
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

export default Privacy; 