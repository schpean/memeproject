/**
 * Route Handler pentru Autentificare în bossme.me
 * 
 * Acest fișier gestionează toate rutele legate de autentificare:
 * - /users/google-auth pentru autentificare Google OAuth
 * - /users/apple-auth pentru autentificare Apple
 * - /users/update-nickname pentru actualizare nickname
 * - /auth/verify-email pentru verificare email
 * 
 * Menține compatibilitatea cu URL-urile existente:
 * - https://bossme.me/users/google-auth
 * - http://localhost:1337/users/google-auth
 * - http://localhost/users/google-auth
 * 
 * Dependențe:
 * - ../services/userService.js pentru logica de business
 * - ../middleware/auth.js pentru verificări de autorizare
 * 
 * IMPORTANT: Toate rutele folosesc acum exclusiv public_id (UUID) pentru identificarea utilizatorilor
 * pentru a asigura agnosticitatea față de metoda de autentificare.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../email');
const { authorize } = require('../middleware/auth');
const { PROVIDERS, ...userQueries } = require('../models/user');
const bcrypt = require('bcryptjs');
// Importăm librăria pentru detectarea email-urilor temporare
const disposableEmailDetector = require('disposable-email-detector');
// Importăm și lista noastră personalizată de domenii
const { isDisposableEmail } = require('../utils/disposableEmails');

// Abstractizarea procesului de autentificare pentru orice provider
const handleAuthProvider = async (req, res, providerName) => {
  try {
    // Extrage datele comune pentru orice provider
    const { email, displayName, photoURL, token } = req.body;
    
    // Extrage ID-ul specific provider-ului
    let providerUserId;
    switch (providerName) {
      case PROVIDERS.GOOGLE:
        providerUserId = req.body.googleId;
        break;
      case PROVIDERS.APPLE:
        providerUserId = req.body.appleId;
        break;
      case PROVIDERS.EMAIL:
        providerUserId = email; // Pentru email, folosim adresa de email ca ID
        break;
      default:
        return res.status(400).json({ error: `Provider invalid: ${providerName}` });
    }
    
    if (!providerUserId || !email) {
      return res.status(400).json({ 
        error: 'Date incomplete', 
        message: `ID-ul provider-ului și adresa de email sunt obligatorii pentru ${providerName}` 
      });
    }
    
    // Verify the token if necessary with provider
    if (!token) {
      console.warn(`No token provided for ${providerName} validation`);
    }
    
    // Verifică utilizatorul după provider și ID
    const user = await userQueries.findByProviderId(providerName, providerUserId);
    
    // Verifică dacă acest utilizator e marcat ca șters
    if (user && user.is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'This account has been deactivated. Please contact the administrator for assistance.'
      });
    }
    
    // Verifică dacă emailul e în blacklist
    const emailCheck = await userQueries.findByEmail(email);
    
    if (emailCheck && emailCheck.is_deleted) {
      return res.status(403).json({ 
        error: 'This email address cannot be used for registration as it was previously associated with a deleted account.' 
      });
    }
    
    if (user) {
      // User exists, update last login time
      await userQueries.updateByPublicId(user.public_id, {
        last_login: new Date(),
        photo_url: getMascotImageUrl(user.username)
      });
      
      // If the user hasn't verified their email yet, prompt them to verify
      // Pentru Google și Apple, nu este necesară verificarea - doar pentru Email
      if (!user.is_verified && providerName === PROVIDERS.EMAIL) {
        // Generate a new verification token
        const verificationToken = uuidv4();
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24); // Token expires in 24 hours
        
        // Update the user's verification token
        await userQueries.updateByPublicId(user.public_id, {
          verification_token: verificationToken,
          verification_expires: expiryTime
        });
        
        // Send verification email
        await emailService.sendVerificationEmail(user, verificationToken);
        
        return res.json({
          ...user,
          userId: user.public_id, // Folosim public_id ca userId principal
          isAdmin: user.role_name === 'admin',
          isModerator: user.role_name === 'moderator' || user.role_name === 'admin',
          needsVerification: true,
          authProvider: providerName
        });
      }
      
      return res.json({
        ...user,
        userId: user.public_id, // Folosim public_id ca userId principal
        isAdmin: user.role_name === 'admin',
        isModerator: user.role_name === 'moderator' || user.role_name === 'admin',
        authProvider: providerName
      });
    }
    
    // User doesn't exist, generate a unique username
    const username = await generateUniqueUsername(displayName);
    
    // Get default role id (user role)
    const roleResult = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1',
      ['user']
    );
    
    const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1;
    
    // Determinăm dacă email-ul necesită verificare
    // Pentru Google și Apple, email-ul este verificat automat
    const isEmailVerified = providerName !== PROVIDERS.EMAIL;
    
    // Generate verification token (doar pentru email)
    let verificationToken = null;
    let expiryTime = null;
    
    if (providerName === PROVIDERS.EMAIL) {
      verificationToken = uuidv4();
      expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24); // Token expiră în 24 ore
    }
    
    // Create new user
    const newUser = await userQueries.create({
      auth_provider: providerName,
      auth_provider_user_id: providerUserId,
      email,
      username,
      photo_url: getMascotImageUrl(username),
      role_id: roleId,
      verification_token: verificationToken,
      verification_expires: expiryTime,
      // Marcăm email-ul ca verificat automat pentru Google și Apple
      is_verified: isEmailVerified
    });
    
    // Send verification email doar pentru Email
    if (providerName === PROVIDERS.EMAIL && verificationToken) {
      await emailService.sendVerificationEmail(newUser, verificationToken);
    }
    
    res.status(201).json({
      ...newUser,
      userId: newUser.public_id, // Folosim public_id ca userId principal
      isAdmin: newUser.role_name === 'admin',
      isModerator: newUser.role_name === 'moderator' || newUser.role_name === 'admin',
      needsVerification: !isEmailVerified, // Verificare necesară doar pentru email
      authProvider: providerName
    });
  } catch (error) {
    console.error(`Error during ${providerName} authentication:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update the Google OAuth login to include role information and email verification
router.post('/google-auth', async (req, res) => {
  return handleAuthProvider(req, res, PROVIDERS.GOOGLE);
});

// Endpoint pentru autentificare Apple (pregătit pentru implementare viitoare)
router.post('/apple-auth', async (req, res) => {
  return handleAuthProvider(req, res, PROVIDERS.APPLE);
});

// Update user nickname
router.post('/update-nickname', async (req, res) => {
  try {
    const { userId, newNickname } = req.body;

    if (!userId || !newNickname) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'User ID and new nickname are required' });
    }

    if (newNickname.length < 3 || newNickname.length > 30) {
      console.log('Invalid nickname length');
      return res.status(400).json({ error: 'Nickname must be between 3 and 30 characters' });
    }

    // Verifică dacă avem un public_id UUID valid
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Invalid user ID format. A valid UUID is required.' });
    }
    
    // Caută utilizatorul după public_id
    const user = await userQueries.findByPublicId(userId);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.nickname_changed) {
      console.log('User already changed nickname');
      return res.status(403).json({ error: 'You can only change your nickname once' });
    }

    if (user.is_deleted) {
      console.log('User is marked as deleted');
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'Your account has been deactivated and cannot be updated.'
      });
    }

    // Check if the nickname is already taken
    const nicknameExists = await userQueries.findByUsername(newNickname);
    if (nicknameExists && nicknameExists.id !== user.id) {
      console.log('Nickname already taken');
      return res.status(400).json({ error: 'This nickname is already taken' });
    }

    // Update the user's nickname using public_id
    await userQueries.updateByPublicId(user.public_id, {
      username: newNickname,
      nickname_changed: true
    });

    res.json({ message: 'Nickname updated successfully', newNickname });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate a unique username
async function generateUniqueUsername(displayName) {
  // Create a base username from display name
  let baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .substring(0, 10); // Limit length
  
  // Add some random colors or animals as prefix
  const colors = ['red', 'blue', 'green', 'purple', 'golden', 'silver', 'black', 'white'];
  const animals = ['fox', 'wolf', 'eagle', 'bear', 'tiger', 'lion', 'hawk', 'deer', 'panda'];
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  
  // Add random number
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  
  // Generate username
  let username = `${randomColor}${randomAnimal}${randomNum}`;
  
  // Check if username exists
  let usernameExists = true;
  while (usernameExists) {
    const exists = await userQueries.findByUsername(username);
    
    if (!exists) {
      usernameExists = false;
    } else {
      // Try another random number
      const newRandomNum = Math.floor(Math.random() * 9000) + 1000;
      username = `${randomColor}${randomAnimal}${newRandomNum}`;
    }
  }
  
  return username;
}

// Helper function to generate a mascot image URL based on username
function getMascotImageUrl(username) {
  if (!username) {
    return 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=anonymous';
  }
  
  // Generate Dicebear avatar URL with username as seed
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`;
}

// Endpoint pentru înregistrare cu email
router.post('/email-register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Validăm datele primite
    if (!email || !password || !displayName) {
      return res.status(400).json({ 
        error: 'Date incomplete', 
        message: 'Email, parola și numele de afișare sunt obligatorii pentru înregistrare'
      });
    }
    
    // Verificăm dacă adresa de email este temporară/de unică folosință
    // 1. Verificăm cu lista noastră personalizată
    if (isDisposableEmail(email)) {
      console.warn(`Încercare de înregistrare cu email temporar blocată (listă personalizată): ${email}`);
      return res.status(400).json({
        error: 'Disposable email',
        message: 'Nu puteți folosi o adresă de email temporară pentru înregistrare. Vă rugăm să folosiți o adresă de email validă.'
      });
    }
    
    // 2. Verificăm și cu librăria, ca o verificare suplimentară
    try {
      const isDisposable = await disposableEmailDetector(email);
      if (isDisposable) {
        console.warn(`Încercare de înregistrare cu email temporar blocată (librărie): ${email}`);
        return res.status(400).json({
          error: 'Disposable email',
          message: 'Nu puteți folosi o adresă de email temporară pentru înregistrare. Vă rugăm să folosiți o adresă de email validă.'
        });
      }
    } catch (error) {
      // Dacă verificarea eșuează, continuăm procesul (nu blocăm utilizatorii din cauza unei erori în verificare)
      console.error('Eroare la verificarea email-ului temporar:', error);
    }
    
    // Verificăm dacă email-ul e deja folosit
    const existingUser = await userQueries.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already in use', 
        message: 'Această adresă de email este deja folosită. Te rugăm să folosești un alt email sau să te conectezi.' 
      });
    }
    
    // Generăm hash pentru parolă
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generăm un username unic
    const username = await generateUniqueUsername(displayName);
    
    // Obținem ID-ul pentru rolul implicit (user)
    const roleResult = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1',
      ['user']
    );
    const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1;
    
    // Generăm token pentru verificare email
    const verificationToken = uuidv4();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // Token expiră în 24 ore
    
    // Creăm utilizatorul
    const newUser = await userQueries.create({
      auth_provider: PROVIDERS.EMAIL,
      auth_provider_user_id: email, // Folosim email-ul ca ID pentru provider-ul EMAIL
      email,
      username,
      password_hash: passwordHash,
      photo_url: getMascotImageUrl(username),
      role_id: roleId,
      verification_token: verificationToken,
      verification_expires: expiryTime
    });
    
    // Trimitem email de verificare
    await emailService.sendVerificationEmail(newUser, verificationToken);
    
    // Răspundem cu informații despre utilizator
    res.status(201).json({
      ...newUser,
      userId: newUser.public_id,
      isAdmin: false,
      isModerator: false,
      needsVerification: true,
      authProvider: PROVIDERS.EMAIL,
      message: 'Contul a fost creat cu succes. Te rugăm să verifici email-ul pentru a-ți confirma contul.'
    });
  } catch (error) {
    console.error('Error during email registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint pentru autentificare cu email și parolă
router.post('/email-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('[AUTH] Încercare de autentificare email pentru:', email);
    
    // Validăm datele primite
    if (!email || !password) {
      console.log('[AUTH] Date incomplete pentru login:', { email: !!email, password: !!password });
      return res.status(400).json({ 
        error: 'Date incomplete', 
        message: 'Email-ul și parola sunt obligatorii pentru autentificare'
      });
    }
    
    // Verificăm dacă email-ul este unul temporar
    if (isDisposableEmail(email)) {
      console.warn(`[AUTH] Încercare de autentificare cu email temporar blocată: ${email}`);
      return res.status(400).json({
        error: 'Disposable email',
        message: 'Nu puteți folosi o adresă de email temporară pentru autentificare. Vă rugăm să folosiți o adresă de email validă.'
      });
    }
    
    // Încercăm să verificăm și cu librăria externă
    try {
      const isDisposable = await disposableEmailDetector(email);
      if (isDisposable) {
        console.warn(`[AUTH] Încercare de autentificare cu email temporar blocată (librărie): ${email}`);
        return res.status(400).json({
          error: 'Disposable email',
          message: 'Nu puteți folosi o adresă de email temporară pentru autentificare. Vă rugăm să folosiți o adresă de email validă.'
        });
      }
    } catch (error) {
      // În caz de eroare, continuăm procesul
      console.error('[AUTH] Eroare la verificarea email-ului temporar:', error);
    }
    
    // Căutăm utilizatorul după email
    const user = await userQueries.findByEmail(email);
    console.log('[AUTH] Utilizator găsit după email:', user ? 'DA' : 'NU');
    
    // Verificăm dacă utilizatorul există
    if (!user) {
      console.log('[AUTH] Utilizator negăsit pentru email:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: 'Email sau parolă incorectă'
      });
    }
    
    // Verificăm dacă utilizatorul e marcat ca șters
    if (user.is_deleted) {
      console.log('[AUTH] Utilizator marcat ca șters:', email);
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'Acest cont a fost dezactivat. Te rugăm să contactezi administratorul pentru asistență.'
      });
    }
    
    // Verificăm parola
    console.log('[AUTH] Verificare parolă pentru:', email, 'hash prezent:', !!user.password_hash);
    const isMatch = user.password_hash ? 
      await bcrypt.compare(password, user.password_hash) : 
      false;
    
    if (!isMatch) {
      console.log('[AUTH] Parolă incorectă pentru:', email);
      return res.status(401).json({ 
        error: 'Invalid credentials', 
        message: 'Email sau parolă incorectă'
      });
    }
    
    // Verificăm dacă email-ul e confirmat
    const needsVerification = user.is_verified === false;
    console.log('[AUTH] Utilizator necesită verificare email:', needsVerification);
    
    // Dacă email-ul nu e confirmat, regenerăm token-ul și trimitem un nou email,
    // dar nu permitem autentificarea
    if (needsVerification) {
      console.log('[AUTH] Regenerare token verificare pentru:', email);
      // Generăm un nou token de verificare
      const verificationToken = uuidv4();
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 24); // Token expiră în 24 ore
      
      // Actualizăm token-ul de verificare
      await userQueries.updateByPublicId(user.public_id, {
        verification_token: verificationToken,
        verification_expires: expiryTime
      });
      
      // Trimitem email de verificare
      await emailService.sendVerificationEmail(user, verificationToken);
      
      // Returnăm un răspuns de eroare specific pentru email neverificat
      console.log('[AUTH] Autentificare refuzată - email neverificat:', email);
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Adresa de email nu a fost verificată. Am trimis un nou email de verificare.',
        needsVerification: true,
        userId: user.public_id
      });
    }
    
    // Actualizăm data ultimului login
    await userQueries.updateByPublicId(user.public_id, {
      last_login: new Date()
    });
    
    // Răspundem cu informații despre utilizator
    console.log('[AUTH] Autentificare reușită pentru:', email, 'public_id:', user.public_id);
    res.json({
      ...user,
      userId: user.public_id,
      isAdmin: user.role_name === 'admin',
      isModerator: user.role_name === 'moderator' || user.role_name === 'admin',
      needsVerification,
      authProvider: PROVIDERS.EMAIL
    });
  } catch (error) {
    console.error('[AUTH] Eroare la autentificare cu email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rută pentru verificarea email-ului
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token-ul de verificare este obligatoriu' });
    }
    
    // Căutăm utilizatorul după token
    const user = await userQueries.findByVerificationToken(token);
    
    if (!user) {
      return res.status(404).json({ error: 'Token invalid sau expirat' });
    }
    
    // Verificăm dacă token-ul nu a expirat
    const now = new Date();
    if (user.verification_expires && new Date(user.verification_expires) < now) {
      return res.status(400).json({ error: 'Token-ul de verificare a expirat' });
    }
    
    // Marcăm email-ul ca verificat
    await userQueries.updateByPublicId(user.public_id, {
      is_verified: true,
      verification_token: null,
      verification_expires: null
    });
    
    // Redirecționăm către pagina de verificare cu parametrul de succes
    res.redirect('/verify-email?verified=true');
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rută pentru retrimiterea email-ului de verificare
router.post('/resend-verification', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID și email sunt obligatorii' });
    }
    
    // Verificăm dacă email-ul este unul temporar
    if (isDisposableEmail(email)) {
      console.warn(`Încercare de retrimitere a email-ului de verificare blocată (email temporar): ${email}`);
      return res.status(400).json({
        error: 'Disposable email',
        message: 'Nu puteți folosi o adresă de email temporară. Vă rugăm să folosiți o adresă de email validă.'
      });
    }
    
    // Încercăm să verificăm și cu librăria externă
    try {
      const isDisposable = await disposableEmailDetector(email);
      if (isDisposable) {
        console.warn(`Încercare de retrimitere a email-ului de verificare blocată (librărie): ${email}`);
        return res.status(400).json({
          error: 'Disposable email',
          message: 'Nu puteți folosi o adresă de email temporară. Vă rugăm să folosiți o adresă de email validă.'
        });
      }
    } catch (error) {
      // În caz de eroare, continuăm procesul
      console.error('Eroare la verificarea email-ului temporar:', error);
    }
    
    // Verifică dacă avem un public_id UUID valid
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({ error: 'Format invalid pentru user ID. Este necesar un UUID valid.' });
    }
    
    // Căutăm utilizatorul după public_id
    const user = await userQueries.findByPublicId(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Utilizator negăsit' });
    }
    
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email-ul este deja verificat' });
    }
    
    // Generăm un nou token de verificare
    const verificationToken = uuidv4();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // Token expiră în 24 ore
    
    // Actualizăm token-ul de verificare
    await userQueries.updateByPublicId(user.public_id, {
      verification_token: verificationToken,
      verification_expires: expiryTime
    });
    
    // Trimitem email de verificare
    await emailService.sendVerificationEmail(user, verificationToken);
    
    res.json({ success: true, message: 'Email-ul de verificare a fost retrimis cu succes' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 