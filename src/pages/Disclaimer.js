import React, { useState } from 'react';
import '../styles/Legal.css';

function Disclaimer() {
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
        
        <h1>Disclaimer</h1>
        
        {language === 'en' ? (
          // Conținut în engleză
          <div className="legal-content">
            <p className="legal-intro">
              This disclaimer outlines the limitations of liability and responsibilities for the content and services provided by bossme.me. By using this site, you agree to the terms below. If you do not agree, please discontinue use immediately.
            </p>
            
            <div className="legal-section" style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '5px', marginBottom: '2rem' }}>
              <p style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                bossme.me is a space for free expression through humor.
                We do not allow posts that reveal real names or content that could be considered defamatory.
                If you recognize yourself in a meme and feel offended... maybe it's time for a change, boss.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>1. Content Accuracy</h2>
              <p>
                All content on bossme.me is user‑generated and subjective. We do not guarantee the accuracy, completeness, or reliability of any posts, comments, memes, or other materials published by users. You acknowledge that any reliance on such content is at your own risk.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. User Responsibilities</h2>
              <p>
                Users are solely responsible for the content they submit. You agree that you will not post anything defamatory, illegal, or infringing on third‑party rights. bossme.me reserves the right to remove or disable access to any content that, in our sole discretion, violates these rules.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. External Links</h2>
              <p>
                Our platform may contain links to third‑party websites or resources. These links are provided for convenience and do not imply endorsement. We are not responsible for the content, privacy policies, or practices of any external sites.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. No Professional Advice</h2>
              <p>
                Content on bossme.me is intended for entertainment and commentary only. It does not constitute professional advice (legal, medical, financial, or otherwise). Always seek the guidance of a qualified professional before making decisions based on any information found here.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Indemnification</h2>
              <p>
                You agree to indemnify, defend, and hold harmless bossme.me, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your use of the site or your breach of this Disclaimer.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, bossme.me, its affiliates, and team members shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Your use or inability to use the platform;</li>
                <li>Any content posted by users;</li>
                <li>Unauthorized access to or alteration of your transmissions or data.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>7. Changes to Disclaimer</h2>
              <p>
                We may update this Disclaimer at any time. When we do, we will revise the "Last updated" date at the bottom of this document. Continued use of bossme.me after changes are made constitutes acceptance of the updated Disclaimer. Significant changes will be communicated via email or site notification.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Contact Information</h2>
              <p>
                If you have any questions about this Disclaimer, please contact us at:<br />
                Email: contact@bossme.me<br />
                Website: https://bossme.me/contact
              </p>
            </div>
          </div>
        ) : (
          // Conținut în română
          <div className="legal-content">
            <p className="legal-intro">
              Această declarație de declinare a responsabilității prezintă limitările de răspundere și responsabilitățile pentru conținutul și serviciile furnizate de bossme.me. Prin utilizarea acestui site, ești de acord cu termenii de mai jos. Dacă nu ești de acord, te rugăm să întrerupi utilizarea imediat.
            </p>
            
            <div className="legal-section" style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '5px', marginBottom: '2rem' }}>
              <p style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                bossme.me este un spațiu de exprimare liberă prin umor.
                Nu permitem postări care dau nume reale sau conținut ce poate fi considerat calomnios.
                Dacă te recunoști într-un meme și te simți ofensat… poate e momentul să te schimbi, boss.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>1. Acuratețea conținutului</h2>
              <p>
                Tot conținutul de pe bossme.me este generat de utilizatori și este subiectiv. Nu garantăm acuratețea, exhaustivitatea sau fiabilitatea postărilor, comentariilor, meme-urilor sau a altor materiale publicate de utilizatori. Recunoști că orice încredere acordată acestui conținut este pe propriul tău risc.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>2. Responsabilitățile utilizatorilor</h2>
              <p>
                Utilizatorii sunt singurii responsabili pentru conținutul pe care îl publică. Ești de acord că nu vei posta nimic defăimător, ilegal sau care încalcă drepturile terților. bossme.me își rezervă dreptul de a elimina sau de a dezactiva accesul la orice conținut care, la discreția noastră, încalcă aceste reguli.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>3. Link-uri externe</h2>
              <p>
                Platforma noastră poate conține linkuri către site-uri web sau resurse terțe. Aceste linkuri sunt furnizate pentru comoditate și nu implică aprobarea noastră. Nu suntem responsabili pentru conținutul, politicile de confidențialitate sau practicile niciunui site extern.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>4. Fără sfaturi profesionale</h2>
              <p>
                Conținutul de pe bossme.me este destinat exclusiv divertismentului și comentariilor. Nu constituie sfaturi profesionale (juridice, medicale, financiare sau de altă natură). Caută întotdeauna îndrumarea unui profesionist calificat înainte de a lua decizii bazate pe informațiile găsite aici.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>5. Despăgubire</h2>
              <p>
                Ești de acord să despăgubești, să aperi și să exonerezi bossme.me, reprezentanții, directorii, angajații și agenții săi de orice pretenții, obligații, daune, pierderi și cheltuieli (inclusiv onorarii rezonabile de avocat) care decurg din sau sunt legate în orice fel de utilizarea site-ului de către tine sau de încălcarea acestei Declarații.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>6. Limitarea răspunderii</h2>
              <p>
                În măsura maximă permisă de lege, bossme.me, afiliații săi și membrii echipei nu vor fi răspunzători pentru niciun fel de daune indirecte, incidentale, speciale, consecvențiale sau punitive, sau pentru orice pierdere de profituri sau venituri, indiferent dacă sunt suferite direct sau indirect, care decurg din:
              </p>
              <ul style={{ paddingLeft: '2rem' }}>
                <li>Utilizarea sau imposibilitatea ta de a utiliza platforma;</li>
                <li>Orice conținut publicat de utilizatori;</li>
                <li>Accesul neautorizat sau modificarea transmisiilor sau datelor tale.</li>
              </ul>
            </div>
            
            <div className="legal-section">
              <h2>7. Modificări ale Declarației</h2>
              <p>
                Putem actualiza această Declarație periodic. Când facem acest lucru, vom revizui data "Ultima actualizare" din partea de jos a acestui document. Utilizarea continuă a bossme.me după efectuarea modificărilor constituie acceptarea Declarației actualizate. Modificările semnificative vor fi comunicate prin e-mail sau prin notificări pe site.
              </p>
            </div>
            
            <div className="legal-section">
              <h2>8. Informații de contact</h2>
              <p>
                Dacă ai întrebări despre această Declarație, te rugăm să ne contactezi la:<br />
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

export default Disclaimer; 