import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './EmailLoginModal.css';
import { FaEnvelope, FaLock, FaTimes, FaCheckCircle } from 'react-icons/fa';

// Constante pentru localStorage
const STORAGE_KEYS = {
  USER: 'memeUser',
  PERMISSIONS: 'userPermissions'
};

const EmailLoginModal = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const overlayRef = useRef(null);
  const mouseDownOnOverlayRef = useRef(false);
  const navigate = useNavigate();
  const { loginWithGoogle, processAuthResult, setAuthError } = useAuth();

  // Optimizare cu useCallback pentru a evita recrearea funcției la fiecare randare
  const closeModal = useCallback(() => {
    console.log('EmailLoginModal: închid modalul');
    setIsVisible(false);
    // Resetăm starea după ce animația de închidere s-a terminat
    setTimeout(() => {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setIsLoading(false);
      setRegistrationSuccess(false);
      setRegisteredEmail('');
    }, 300); // Un mic delay pentru a se sincroniza cu animația CSS
  }, []);

  // Funcția optimizată pentru a arăta modalul
  const showModal = useCallback(() => {
    console.log('EmailLoginModal: eveniment primit, afișez modalul');
    setIsVisible(true);
  }, []);
  
  // Detectăm când mouse-ul este apăsat pe overlay
  const handleOverlayMouseDown = useCallback((e) => {
    // Verificăm dacă click-ul a început exact pe overlay
    if (e.target === overlayRef.current) {
      mouseDownOnOverlayRef.current = true;
    } else {
      mouseDownOnOverlayRef.current = false;
    }
  }, []);
  
  // Detectăm când mouse-ul este eliberat
  const handleOverlayMouseUp = useCallback((e) => {
    // Verificăm dacă și mouse up-ul s-a întâmplat pe overlay și dacă mouse down-ul a fost tot pe overlay
    if (e.target === overlayRef.current && mouseDownOnOverlayRef.current) {
      closeModal();
    }
    // Resetăm pentru următoarea interacțiune
    mouseDownOnOverlayRef.current = false;
  }, [closeModal]);

  // Ascultăm evenimentul pentru afișarea modalului
  useEffect(() => {
    console.log('EmailLoginModal: adăugare listener pentru eveniment');
    
    window.addEventListener('showEmailLoginModal', showModal);
    
    return () => {
      console.log('EmailLoginModal: eliminare listener');
      window.removeEventListener('showEmailLoginModal', showModal);
    };
  }, [showModal]);

  // Funcție pentru login cu email și parolă - optimizată pentru performanță
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevenim multiple submituri

    setError('');
    setIsLoading(true);

    try {
      // Implementăm o validare rapidă înainte de a face cererea
      if (!email || !password) {
        throw new Error('Te rugăm să completezi toate câmpurile');
      }

      console.log('[EmailLoginModal] Încercare de autentificare cu email:', { email, passwordLength: password?.length });
      
      const response = await fetch('/users/email-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('[EmailLoginModal] Status răspuns login:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('[EmailLoginModal] Răspuns login:', JSON.stringify(data));

      // Verificăm statusul special pentru email neverificat (403 cu mesaj specific)
      if (response.status === 403 && data.error === 'Email not verified') {
        console.log('[EmailLoginModal] Email neverificat detectat');
        setError('Adresa de email nu a fost verificată. Am trimis un nou email de verificare. Te rugăm să verifici căsuța de email.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la autentificare');
      }

      // Salvăm token-ul dacă există
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Folosim processAuthResult furnizat de context, dar cu un obiect adaptat
      // care conține toate câmpurile necesare
      const userData = {
        providerUserId: email,
        displayName: data.username || email.split('@')[0],
        email: email,
        // Includem parola pentru a o avea disponibilă la a doua cerere dacă este necesar
        password: password,
        photoURL: data.photo_url || null,
        token: data.token, // Important: transmite token-ul dacă există
        // Adăugăm informații suplimentare care vor fi transmise de processAuthResult
        public_id: data.public_id || data.userId,
        userId: data.userId || data.public_id,
        isEmailVerified: data.is_verified || false,
        needsVerification: data.needsVerification || false,
        // Marcăm ca utilizator existent (conectare, nu înregistrare)
        isExistingUser: true
      };

      console.log('[EmailLoginModal] Procesare date utilizator:', { 
        ...userData, 
        password: userData.password ? '[PAROLĂ PREZENTĂ]' : '[LIPSĂ]',
        token: userData.token ? '[TOKEN PREZENT]' : '[LIPSĂ]',
        public_id: userData.public_id ? userData.public_id.substring(0, 8) + '...' : null
      });

      // Actualizăm permisiunile direct
      const permissions = {
        isAdmin: data.isAdmin || false,
        isModerator: data.isModerator || false
      };
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));

      // Folosim funcția standard din context pentru a procesa autentificarea
      // și a actualiza starea aplicației
      // Transmitem skipAuthRequest=true pentru a evita cererea HTTP redundantă
      processAuthResult(userData, 'email', true);
      
      // Încheiem procesul închizând modalul
      closeModal();
    } catch (error) {
      console.error('[EmailLoginModal] Eroare autentificare detaliată:', error);
      setAuthError(error.message || 'A apărut o eroare la autentificare. Te rugăm să încerci din nou.');
      setError(error.message || 'A apărut o eroare la autentificare. Te rugăm să încerci din nou.');
      setIsLoading(false); // Asigurăm că starea de loading este resetată în caz de eroare
    }
  };

  // Funcție pentru înregistrare cu email - optimizată pentru performanță
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevenim multiple submituri
    
    setError('');
    setIsLoading(true);

    // Validare rapidă input pentru a evita request-uri inutile
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Te rugăm să introduci o adresă de email validă');
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere');
      setIsLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Parolele introduse nu coincid');
      setIsLoading(false);
      return;
    }

    try {
      const displayNameValue = email.split('@')[0]; // Folosim prima parte a emailului ca displayName
      console.log('[EmailLoginModal] Încercare de înregistrare cu email:', { 
        email, 
        passwordLength: password?.length,
        displayName: displayNameValue
      });
      
      const response = await fetch('/users/email-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email, 
          password, 
          displayName: displayNameValue
        })
      });

      console.log('[EmailLoginModal] Status răspuns înregistrare:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('[EmailLoginModal] Răspuns înregistrare:', JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.message || 'Eroare la înregistrare');
      }

      // În loc să procesăm autentificarea, afișăm un mesaj de succes
      setRegistrationSuccess(true);
      setRegisteredEmail(email);
      setIsLoading(false);
      
      // Salvăm token-ul dacă există, dar nu-l folosim pentru autentificare încă
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Nu mai executăm redirectarea sau processAuthResult
      // doar afișăm un mesaj că utilizatorul trebuie să-și verifice emailul
      
    } catch (error) {
      console.error('[EmailLoginModal] Eroare înregistrare detaliată:', error);
      setAuthError(error.message || 'A apărut o eroare la înregistrare. Te rugăm să încerci din nou.');
      setError(error.message || 'A apărut o eroare la înregistrare. Te rugăm să încerci din nou.');
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setConfirmPassword('');
    setRegistrationSuccess(false);
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return; // Prevenim acțiuni multiple
    
    setIsLoading(true);
    try {
      await loginWithGoogle();
      closeModal();
    } catch (error) {
      setError(error.message || 'A apărut o eroare la autentificarea cu Google.');
      setIsLoading(false);
    }
  };

  // Pentru debugging - optimizat pentru a se declanșa doar când starea se schimbă
  useEffect(() => {
    console.log('EmailLoginModal: stare isVisible =', isVisible);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="email-login-overlay" 
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div 
        className="email-login-modal" 
      >
        <button className="close-modal" onClick={closeModal} aria-label="Închide">
          <FaTimes />
        </button>
        
        {registrationSuccess ? (
          <div className="registration-success">
            <FaCheckCircle className="success-icon" />
            <h2>Înregistrare reușită!</h2>
            <p>Am trimis un email de confirmare la adresa:</p>
            <p className="email-highlight">{registeredEmail}</p>
            <p>Te rugăm să verifici căsuța de email și să confirmi contul tău apăsând pe linkul din email.</p>
            <p className="info-small">Nu uita să verifici și în folderul de Spam dacă nu găsești emailul în Inbox.</p>
            
            <div className="action-buttons">
              <button 
                className="submit-button" 
                onClick={() => {
                  setIsLogin(true);
                  setRegistrationSuccess(false);
                }}
              >
                Mergi la conectare
              </button>
              <button 
                className="secondary-button" 
                onClick={closeModal}
              >
                Închide
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>{isLogin ? 'Conectare' : 'Înregistrare'} cu email</h2>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={isLogin ? handleEmailLogin : handleEmailRegister}>
              <div className="form-group">
                <label htmlFor="email">
                  <FaEnvelope /> Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Adresa ta de email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">
                  <FaLock /> Parolă
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Parola ta"
                  minLength="6"
                  disabled={isLoading}
                />
              </div>
              
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    <FaLock /> Confirmă parola
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirmă parola"
                    minLength="6"
                    disabled={isLoading}
                  />
                </div>
              )}
              
              <button 
                type="submit" 
                className={`submit-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading 
                  ? 'Se procesează...' 
                  : isLogin 
                    ? 'Conectare' 
                    : 'Înregistrare'
                }
              </button>
              
              <div className="terms-notice">
                {isLogin 
                  ? 'Prin conectare, accepți ' 
                  : 'Prin înregistrare, accepți '
                }
                <a href="/terms" target="_blank">Termenii și Condițiile</a> și <a href="/privacy" target="_blank">Politica de Confidențialitate</a> ale bossme.me
              </div>
            </form>
            
            <div className="auth-separator">
              <span>sau</span>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              className="google-button"
              disabled={isLoading}
            >
              Continuă cu Google
            </button>
            
            <p className="switch-mode">
              {isLogin 
                ? 'Nu ai cont?' 
                : 'Ai deja un cont?'
              } 
              <button 
                type="button"
                onClick={switchMode}
                className="switch-button"
                disabled={isLoading}
              >
                {isLogin ? 'Înregistrează-te' : 'Conectează-te'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailLoginModal; 