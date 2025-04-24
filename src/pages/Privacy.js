import React, { useState } from 'react';
import '../styles/Legal.css';
import { Link } from 'react-router-dom';

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
              <h2>3. Cookies and Storage Technologies</h2>
              <p>
                We use essential cookies and local storage technologies to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Remember your preferences;</li>
                <li>Keep you logged in to your account;</li>
                <li>Remember your cookie consent choices.</li>
              </ul>
              <p>
                Currently, we do not use cookies for analytics, advertising, or tracking purposes. You can control or disable cookies through your browser settings. For more details, refer to our <Link to="/cookies">Cookie Policy</Link>.
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
              <h2>6. GDPR Compliance</h2>
              <p>
                As a platform that may process data from EU residents, we comply with the General Data Protection Regulation (GDPR). Our compliance includes:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Legal Basis for Processing:</strong> We process your data based on legitimate interests (operating our platform), consent (when you explicitly provide it), contractual necessity (to provide our services), or legal obligations.</li>
                <li><strong>Data Retention:</strong> We retain personal data only for as long as necessary to fulfill the purposes for which it was collected, or as required by law. Inactive accounts may be archived after 12 months of inactivity.</li>
                <li><strong>International Transfers:</strong> When data is transferred outside the EEA, we ensure adequate safeguards are in place, such as Standard Contractual Clauses or operating with service providers certified under recognized frameworks.</li>
                <li><strong>Data Protection Officer:</strong> While not legally required for our organization size, we have designated personnel responsible for data protection matters.</li>
                <li><strong>Data Protection Impact Assessments:</strong> We conduct assessments when new processing activities may result in high risk to your rights and freedoms.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>7. User Rights</h2>
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
                To exercise these rights, contact us at: contact@bossme.me
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Children's Privacy</h2>
              <p>
                Our platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately at contact@bossme.me, and we will take steps to remove that information from our servers.
              </p>
              <p>
                In the EU and EEA, different age limits may apply according to local laws (generally between 13 and 16 years). If you're a resident of these areas and under the applicable age limit, you must have parental consent before providing any personal data to the website.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>9. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the bottom of this document and notify users of significant changes via email or on the platform. Continued use of the platform after changes indicates your acceptance of the revised policy.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>10. Contact Information</h2>
              <p>
                If you have any questions about this Privacy Policy or your data, please contact us at:<br />
                Email: contact@bossme.me<br />
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
              <h2>3. Cookie-uri și Tehnologii de Stocare</h2>
              <p>
                Folosim cookie-uri esențiale și tehnologii de stocare locală pentru a:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Memora preferințele tale;</li>
                <li>Te menține conectat la contul tău;</li>
                <li>Reține alegerile tale privind consimțământul pentru cookie-uri.</li>
              </ul>
              <p>
                În prezent, nu folosim cookie-uri pentru analiză, publicitate sau urmărire. Poți controla sau dezactiva cookie-urile prin setările browserului tău. Pentru mai multe detalii, consultă <Link to="/cookies">Politica noastră privind Cookie-urile</Link>.
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
              <h2>6. Conformitate cu GDPR</h2>
              <p>
                Ca platformă care poate procesa date de la rezidenți UE, respectăm Regulamentul General privind Protecția Datelor (GDPR). Conformitatea noastră include:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li><strong>Temeiul legal pentru prelucrare:</strong> Prelucrăm datele tale pe baza intereselor legitime (operarea platformei noastre), consimțământului (când îl oferi explicit), necesității contractuale (pentru a furniza serviciile noastre) sau obligațiilor legale.</li>
                <li><strong>Păstrarea datelor:</strong> Păstrăm datele personale doar atât timp cât este necesar pentru îndeplinirea scopurilor pentru care au fost colectate sau conform cerințelor legale. Conturile inactive pot fi arhivate după 12 luni de inactivitate.</li>
                <li><strong>Transferuri internaționale:</strong> Când datele sunt transferate în afara SEE, ne asigurăm că există garanții adecvate, cum ar fi Clauzele Contractuale Standard sau colaborarea cu furnizori de servicii certificați în cadrul unor cadre recunoscute.</li>
                <li><strong>Responsabil cu protecția datelor:</strong> Deși nu este obligatoriu din punct de vedere legal pentru dimensiunea organizației noastre, am desemnat personal responsabil pentru aspectele legate de protecția datelor.</li>
                <li><strong>Evaluări de impact privind protecția datelor:</strong> Efectuăm evaluări atunci când noile activități de prelucrare pot prezenta un risc ridicat pentru drepturile și libertățile tale.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>7. Drepturile utilizatorilor</h2>
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
                Pentru a-ți exercita aceste drepturi, contactează-ne la: contact@bossme.me
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Confidențialitatea Copiilor</h2>
              <p>
                Platforma noastră nu este destinată utilizării de către persoane cu vârsta sub 18 ani. Nu colectăm cu bună știință informații personale de la copii sub 18 ani. Dacă ești părinte sau tutore și crezi că copilul tău ne-a furnizat informații personale, te rugăm să ne contactezi imediat la contact@bossme.me, și vom lua măsuri pentru a elimina aceste informații de pe serverele noastre.
              </p>
              <p>
                În UE și SEE, pot fi aplicabile diferite limite de vârstă în conformitate cu legile locale (în general între 13 și 16 ani). Dacă ești rezident al acestor zone și sub limita de vârstă aplicabilă, trebuie să ai consimțământul părinților înainte de a furniza orice date personale pe website.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>9. Modificări ale acestei Politici de Confidențialitate</h2>
              <p>
                Este posibil să actualizăm această Politică de Confidențialitate periodic. Când facem acest lucru, vom revizui data "Ultima actualizare" din partea de jos a acestui document și vom notifica utilizatorii despre modificările semnificative prin e-mail sau pe platformă. Utilizarea continuă a platformei după modificări indică acceptarea politicii revizuite.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>10. Informații de contact</h2>
              <p>
                Dacă ai întrebări despre această Politică de Confidențialitate sau despre datele tale, te rugăm să ne contactezi la:<br />
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

export default Privacy; 