/**
 * Serviciul de email pentru bossme.me
 * Configurează și gestionează toate funcționalitățile legate de trimiterea de emailuri.
 */

const nodemailer = require('nodemailer');
const config = require('./config');

// Afișează configurația de email pentru debugging
console.log('==== Configurare Email încărcată din config.js ====');
console.log('Host:', config.emailConfig.host);
console.log('Port:', config.emailConfig.port);
console.log('Secure:', config.emailConfig.secure);
console.log('User:', config.emailConfig.auth.user);
console.log('From:', config.emailConfig.from);
console.log('=======================================');

// Verifică și ajustează configurația dacă e necesar
if (typeof config.emailConfig.secure === 'string') {
  config.emailConfig.secure = config.emailConfig.secure.toLowerCase() === 'true';
  console.log('Secure convertit la boolean:', config.emailConfig.secure);
}

// Asigură-te că portul este număr
if (typeof config.emailConfig.port === 'string') {
  config.emailConfig.port = parseInt(config.emailConfig.port, 10);
  console.log('Port convertit la număr:', config.emailConfig.port);
}

// Determină dacă suntem în mediul de producție
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Creează un transporter nodemailer pentru trimiterea emailurilor
 */
const transporter = nodemailer.createTransport({
  host: config.emailConfig.host,
  port: config.emailConfig.port,
  secure: config.emailConfig.secure,
  auth: {
    user: config.emailConfig.auth.user,
    pass: config.emailConfig.auth.pass,
    type: 'login' // Adăugat explicit pentru Zoho Mail
  },
  debug: !isProduction, // Activează debug doar în dezvoltare
  logger: !isProduction  // Activează logging doar în dezvoltare
});

/**
 * Obține URL-ul corect în funcție de mediu
 * @param {string} path - Calea relativă (ex: 'users/verify-email')
 * @returns {string} URL-ul complet
 */
function getClientUrl(path = '') {
  const baseUrl = config.urls.client;
  // Elimină slash-ul final din baseUrl dacă există
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  // Adaugă slash la începutul path-ului dacă nu există
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

/**
 * Verifică dacă configurația de email este validă
 * @returns {Promise<boolean>} Rezultatul verificării
 */
async function verifyEmailConfig() {
  try {
    console.log('Verificare cu următoarea configurație:');
    console.log('Host:', config.emailConfig.host);
    console.log('Port:', config.emailConfig.port);
    console.log('Secure:', config.emailConfig.secure);
    console.log('User:', config.emailConfig.auth.user);
    
    await transporter.verify();
    console.log('Conexiune la serviciul de email reușită!');
    return true;
  } catch (error) {
    console.error('Eroare verificare serviciu email:', error);
    return false;
  }
}

/**
 * Trimite un email de bun venit
 * @param {object} user Obiectul utilizator
 * @returns {Promise<object>} Rezultatul trimiterii
 */
async function sendWelcomeEmail(user) {
  const mailOptions = {
    from: config.emailConfig.from,
    to: user.email,
    subject: 'Bun venit la bossme.me! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Bine ai venit la bossme.me!</h2>
        <p>Salut ${user.nickname || 'Utilizator'},</p>
        <p>Îți mulțumim că te-ai alăturat comunității noastre. Suntem încântați să te avem alături!</p>
        <p>Cu bossme.me, poți:</p>
        <ul>
          <li>Creezi și partajezi meme-uri amuzante</li>
          <li>Interacționezi cu alți creatori de conținut</li>
          <li>Salvezi meme-urile tale preferate</li>
        </ul>
        <p>Intră în contul tău și începe să creezi: <a href="${getClientUrl()}" style="color: #4CAF50; text-decoration: none;">bossme.me</a></p>
        <p>La orice întrebare, nu ezita să ne contactezi.</p>
        <p>Cu prietenie,<br>Echipa bossme.me</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de bun venit trimis:', info.messageId);
    return info;
  } catch (error) {
    console.error('Eroare trimitere email de bun venit:', error);
    throw error;
  }
}

/**
 * Trimite un email de verificare a adresei de email
 * @param {object} user Obiectul utilizator
 * @param {string} token Tokenul de verificare
 * @returns {Promise<object>} Rezultatul trimiterii
 */
async function sendVerificationEmail(user, token) {
  const verificationLink = `${getClientUrl('users/verify-email')}?token=${token}`;
  
  const mailOptions = {
    from: config.emailConfig.from,
    to: user.email,
    subject: 'Verifică-ți adresa de email pentru bossme.me',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verificare adresă email</h2>
        <p>Salut ${user.nickname || 'Utilizator'},</p>
        <p>Mulțumim pentru înregistrarea pe bossme.me!</p>
        <p>Pentru a-ți activa contul, te rugăm să confirmi adresa de email făcând clic pe butonul de mai jos:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Verifică adresa de email</a>
        </div>
        <p>Sau copiază și lipește acest link în browser:</p>
        <p style="word-break: break-all;"><a href="${verificationLink}">${verificationLink}</a></p>
        <p>Dacă nu ai solicitat crearea unui cont, te rugăm să ignori acest mesaj.</p>
        <p>Cu prietenie,<br>Echipa bossme.me</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de verificare trimis:', info.messageId);
    return info;
  } catch (error) {
    console.error('Eroare trimitere email de verificare:', error);
    throw error;
  }
}

/**
 * Trimite un email pentru resetarea parolei
 * @param {object} user Obiectul utilizator
 * @param {string} token Tokenul de resetare
 * @returns {Promise<object>} Rezultatul trimiterii
 */
async function sendPasswordResetEmail(user, token) {
  const resetLink = `${getClientUrl('users/reset-password')}?token=${token}`;
  
  const mailOptions = {
    from: config.emailConfig.from,
    to: user.email,
    subject: 'Resetare parolă pentru bossme.me',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Resetare parolă</h2>
        <p>Salut ${user.nickname || 'Utilizator'},</p>
        <p>Am primit o solicitare de resetare a parolei pentru contul tău bossme.me.</p>
        <p>Pentru a-ți seta o nouă parolă, te rugăm să faci clic pe butonul de mai jos:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Resetează parola</a>
        </div>
        <p>Sau copiază și lipește acest link în browser:</p>
        <p style="word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
        <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest mesaj și să-ți verifici securitatea contului.</p>
        <p>Cu prietenie,<br>Echipa bossme.me</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email de resetare parolă trimis:', info.messageId);
    return info;
  } catch (error) {
    console.error('Eroare trimitere email de resetare parolă:', error);
    throw error;
  }
}

// Exportă funcțiile folosind modul CommonJS
module.exports = {
  verifyEmailConfig,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
}; 