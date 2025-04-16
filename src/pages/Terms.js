import React, { useState } from 'react';
import '../styles/Legal.css';

function Terms() {
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
        
        <h1>Terms of Service</h1>
        
        {language === 'en' ? (
          // Conținut în engleză
          <div className="legal-content">
            <p className="legal-intro">
              Welcome to bossme.me! These Terms of Service ("Terms") govern your use of our website and services. By accessing or using bossme.me, you agree to comply with and be bound by these Terms. If you do not agree, please do not use our platform.
            </p>
            
            <div className="legal-section">
              <h2>1. Introduction</h2>
              <p>
                bossme.me is a satire and humor-based platform that allows users to create and share meme-style content about workplace experiences, colleagues, and company culture. All content is user-generated and subjective in nature. The platform is designed for entertainment and commentary purposes and does not claim factual accuracy of any content posted.
              </p>
              <p>
                Satire & Humor: Content shared on bossme.me is intended as satire and humor. It is not factual and should not be interpreted as such. All posts are subjective opinions and do not reflect real events or actual occurrences.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. User Accounts</h2>
              <p>
                To access certain features, you may be required to create an account. You agree to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Provide accurate and complete information.</li>
                <li>Keep your login credentials secure.</li>
                <li>Be fully responsible for all activities under your account.</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms, our content guidelines, or applicable laws.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. Content Guidelines</h2>
              <p>
                You are solely responsible for the content you submit or share. By using bossme.me, you agree not to post content that:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Is defamatory, libelous, harassing, or threatening.</li>
                <li>Violates any third-party rights, including privacy, publicity, or intellectual property.</li>
                <li>Contains hate speech, discriminatory language, or promotes violence.</li>
                <li>Is illegal or promotes illegal activities.</li>
              </ul>
              <p>
                We reserve the right to remove any content that we, at our sole discretion, deem inappropriate or in violation of these Terms.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. Intellectual Property</h2>
              <p>
                You retain ownership of any content you submit. However, by posting on bossme.me, you grant us a non-exclusive, worldwide, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Use, display, reproduce, distribute, and modify your content;</li>
                <li>Create derivative works from your content;</li>
                <li>Use your content for promotional purposes or to create merchandise or other commercial products.</li>
              </ul>
              <p>
                You represent and warrant that you have all necessary rights to grant this license.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Termination</h2>
              <p>
                We may suspend or terminate your access to bossme.me at any time, without prior notice, if we determine that you have violated these Terms, our content guidelines, or applicable laws. Upon termination, your right to use the service will immediately cease. You may terminate your account at any time by contacting us or following the instructions on our platform.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, bossme.me, its affiliates, and team members shall not be liable for any direct, indirect, incidental, or consequential damages resulting from:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Your use or inability to use the platform;</li>
                <li>Any content posted by users;</li>
                <li>Unauthorized access to or alteration of your content or data.</li>
              </ul>
              <p>
                All content is provided "as is" and "as available," without warranties of any kind. bossme.me makes no representations or warranties regarding the reliability, completeness, or accuracy of the content shared on the platform.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Changes to Terms</h2>
              <p>
                We may update these Terms from time to time. When we do, we will revise the "Last updated" date at the bottom of this document. Continued use of the platform after any changes constitutes your acceptance of the updated Terms. We will notify users of substantial changes via email or on-site notification.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:<br />
                Email: contact@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>

            <div className="legal-section">
              <h2>9. User Content and Copyright Infringement</h2>
              <p>
                User Responsibility: Users are solely responsible for the content they upload to bossme.me. If you believe that content posted on the platform infringes upon your intellectual property rights, please contact us immediately at copyright@bossme.me. We will investigate and, if necessary, remove any content that violates copyright laws.
              </p>
            </div>

            <div className="legal-section">
              <h2>10. Termination of Content</h2>
              <p>
                bossme.me reserves the right to remove content from the platform at its sole discretion, including but not limited to content that violates these Terms, intellectual property rights, or applicable law. Users may also request the removal of their own content by contacting us directly.
              </p>
            </div>

            <div className="legal-section">
              <h2>11. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of Romania, the European Union (EU), and the European Economic Area (EEA), without regard to its conflict of law principles.
              </p>
            </div>
          </div>
        ) : (
          // Conținut în română
          <div className="legal-content">
            <p className="legal-intro">
              Bine ai venit pe bossme.me! Acești Termeni și Condiții ("Termeni") guvernează utilizarea website-ului nostru și a serviciilor oferite. Prin accesarea sau utilizarea platformei noastre, ești de acord să respecți și să te supui acestor termeni. Dacă nu ești de acord cu acești termeni, te rugăm să nu folosești platforma noastră.
            </p>
            
            <div className="legal-section">
              <h2>1. Introducere</h2>
              <p>
                bossme.me este o platformă bazată pe satiră și umor, care permite utilizatorilor să creeze și să distribuie conținut sub formă de meme despre experiențele de la locul de muncă, colegi și cultura organizațională. Tot conținutul este generat de utilizatori și este subiectiv prin natura sa. Platforma este destinată scopurilor de divertisment și comentarii și nu garantează acuratețea factuală a niciunui conținut postat.
              </p>
              <p>
                Satiră și Umor: Conținutul distribuit pe bossme.me este destinat satirii și umorului. Nu este factual și nu trebuie interpretat ca atare. Toate postările sunt opinii subiective și nu reflectă evenimente reale sau fapte concrete.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. Conturi de Utilizator</h2>
              <p>
                Pentru a accesa anumite funcționalități, este posibil să fie necesar să îți creezi un cont. Ești de acord să:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Furnizezi informații corecte și complete;</li>
                <li>Păstrezi datele tale de autentificare în siguranță;</li>
                <li>Fii pe deplin responsabil pentru toate activitățile desfășurate prin intermediul contului tău.</li>
              </ul>
              <p>
                Ne rezervăm dreptul de a suspenda sau de a închide conturile care încalcă acești Termeni, ghidurile noastre de conținut sau legile aplicabile.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. Ghiduri de Conținut</h2>
              <p>
                Ești pe deplin responsabil pentru conținutul pe care îl publici sau îl distribui. Prin utilizarea bossme.me, ești de acord să nu postezi conținut care:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Este defăimător, calomniator, hărțuitor sau amenințător;</li>
                <li>Încalcă drepturile terților, inclusiv drepturile de confidențialitate, publicitate sau proprietate intelectuală;</li>
                <li>Conține discurs instigator la ură, limbaj discriminatoriu sau promovează violența;</li>
                <li>Este ilegal sau promovează activități ilegale.</li>
              </ul>
              <p>
                Ne rezervăm dreptul de a elimina orice conținut pe care îl considerăm, la discreția noastră, inadecvat sau care încalcă acești Termeni.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. Proprietatea Intelectuală</h2>
              <p>
                Tu păstrezi drepturile de proprietate asupra oricărui conținut pe care îl publici. Totuși, prin postarea conținutului pe bossme.me, ne acorzi o licență neexclusivă, mondială, fără redevențe, perpetuă, irevocabilă, sublicențiabilă și transferabilă pentru a:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Utiliza, afișa, reproduce, distribui și modifica conținutul tău;</li>
                <li>Crea opere derivate pe baza conținutului tău;</li>
                <li>Folosi conținutul tău în scopuri promoționale sau pentru a crea produse comerciale, inclusiv produse de tip merchandise.</li>
              </ul>
              <p>
                Declari și garantezi că deții toate drepturile necesare pentru a acorda această licență.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Încheierea Contului</h2>
              <p>
                Ne rezervăm dreptul de a suspenda sau de a închide accesul tău la bossme.me în orice moment, fără notificare prealabilă, dacă determinăm că ai încălcat acești Termeni, ghidurile noastre de conținut sau legile aplicabile. După închiderea contului, dreptul tău de a utiliza serviciul va înceta imediat. Poți închide contul tău oricând, contactându-ne sau urmând instrucțiunile disponibile pe platformă.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. Limitarea Răspunderii</h2>
              <p>
                În măsura maximă permisă de lege, bossme.me, afiliații săi și membrii echipei nu vor fi răspunzători pentru niciun fel de daune directe, indirecte, incidentale sau consecvențiale rezultate din:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Utilizarea sau imposibilitatea ta de a utiliza platforma;</li>
                <li>Orice conținut publicat de utilizatori;</li>
                <li>Accesul neautorizat sau modificarea transmisiilor sau datelor tale.</li>
              </ul>
              <p>
                Tot conținutul este furnizat "ca atare" și "în funcție de disponibilitate", fără niciun fel de garanții. bossme.me nu garantează fiabilitatea, completitudinea sau acuratețea conținutului distribuit pe platformă.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>7. Modificări ale Termenilor</h2>
              <p>
                Este posibil să actualizăm acești Termeni periodic. Când facem acest lucru, vom revizui data "Ultima actualizare" din partea de jos a acestui document. Continuarea utilizării platformei după orice modificare reprezintă acceptarea ta a Termenilor actualizați. Vom notifica utilizatorii despre modificările importante prin email sau prin notificări pe site.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Informații de Contact</h2>
              <p>
                Dacă ai întrebări despre acești Termeni, te rugăm să ne contactezi la:<br />
                Email: contact@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>

            <div className="legal-section">
              <h2>9. Conținutul Utilizatorilor și Încălcarea Drepturilor de Autor</h2>
              <p>
                Responsabilitatea Utilizatorului: Utilizatorii sunt pe deplin responsabili pentru conținutul pe care îl încarcă pe bossme.me. Dacă consideri că un conținut publicat pe platformă încalcă drepturile tale de proprietate intelectuală, te rugăm să ne contactezi imediat la copyright@bossme.me. Vom investiga și, dacă este necesar, vom elimina orice conținut care încalcă legile drepturilor de autor.
              </p>
            </div>

            <div className="legal-section">
              <h2>10. Eliminarea Conținutului</h2>
              <p>
                bossme.me își rezervă dreptul de a elimina conținutul de pe platformă la propria sa discreție, inclusiv, dar fără a se limita la, conținutul care încalcă acești Termeni, drepturile de proprietate intelectuală sau legile aplicabile. Utilizatorii pot solicita, de asemenea, eliminarea propriului conținut prin contactarea noastră directă.
              </p>
            </div>

            <div className="legal-section">
              <h2>11. Legea Aplicabilă</h2>
              <p>
                Acești Termeni vor fi guvernați și interpretați în conformitate cu legislația României, a Uniunii Europene (UE) și a Spațiului Economic European (SEE), fără a ține cont de principiile privind conflictele de legi.
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

export default Terms; 