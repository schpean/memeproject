/**
 * Serviciu pentru gestionarea email-urilor în bossme.me
 * 
 * Acest modul gestionează trimiterea email-urilor pentru:
 * - verificare email
 * - resetare parolă
 * - notificări
 * 
 * Funcționeazî cu orice provider de email configurat în .env
 */

// Import module necesare
const AWS = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
// Importăm și lista noastră personalizată de domenii
const { isDisposableEmail } = require('../utils/disposableEmails');

// Configurăm provider-ul de email bazat pe variabilele de mediu
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console';
let transporter;

// Configurare serviciu de email în funcție de provider
if (EMAIL_PROVIDER === 'aws-ses') {
  // Configurare AWS SES 
  const ses = new AWS.SES({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });
  
  // Crear transportor pentru AWS SES
  transporter = nodemailer.createTransport({
    SES: { ses, aws: AWS },
    sendingRate: 10 // Limită de 10 email-uri pe secundă
  });
} else if (EMAIL_PROVIDER === 'smtp') {
  // Configurare SMTP generic
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // Pentru dezvoltare, afișăm email-urile în consolă
  console.log('Utilizare email în consolă pentru dezvoltare');
  transporter = {
    sendMail: (options) => {
      console.log('====== EMAIL CONSOLA ======');
      console.log('CĂTRE:', options.to);
      console.log('SUBIECT:', options.subject);
      console.log('CONȚINUT:', options.text || options.html);
      console.log('==========================');
      return Promise.resolve({ messageId: 'console-email-' + Date.now() });
    }
  };
}

/**
 * Funcție generală pentru trimiterea email-urilor
 * @param {Object} options - Opțiuni pentru email (to, subject, text, html)
 * @returns {Promise<Object>} Rezultatul trimiterii
 */
const sendEmail = async (options) => {
  try {
    // Validare câmpuri obligatorii
    if (!options.to) {
      throw new Error('Lipsește destinatarul (to) pentru email');
    }
    
    if (!options.subject) {
      throw new Error('Lipsește subiectul email-ului');
    }
    
    if (!options.text && !options.html) {
      throw new Error('Email-ul trebuie să conțină fie text, fie HTML');
    }
    
    // Adaugă expeditorul implicit dacă nu este specificat
    const mailOptions = {
      from: options.from || `"bossme.me" <${process.env.EMAIL_FROM || 'noreply@bossme.me'}>`,
      ...options
    };
    
    // Trimite email-ul
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Eroare la trimiterea email-ului:', error);
    return { success: false, error };
  }
};

/**
 * Trimite un email de verificare către un utilizator
 * @param {Object} user - Utilizatorul căruia i se trimite email-ul
 * @param {string} token - Token-ul de verificare
 * @returns {Promise<Object>} Rezultatul trimiterii
 */
const sendVerificationEmail = async (user, token) => {
  try {
    console.log('Trimitere email de verificare pentru:', user.email);
    
    // Verificăm cu lista noastră personalizată de domenii
    if (isDisposableEmail(user.email)) {
      console.warn(`Email de verificare blocat - adresă temporară detectată (listă personalizată): ${user.email}`);
      return { success: false, message: 'Adresa de email este temporară' };
    }
    
    // Verificăm dacă email-ul este unul temporar/de unică folosință și dacă da, nu trimitem email
    try {
      const disposableEmailDetector = require('disposable-email-detector');
      const isDisposable = await disposableEmailDetector(user.email);
      if (isDisposable) {
        console.warn(`Email de verificare blocat - adresă temporară detectată (librărie): ${user.email}`);
        return { success: false, message: 'Adresa de email este temporară' };
      }
    } catch (error) {
      // Continuăm procesul dacă verificarea nu funcționează
      console.error('Eroare la verificarea email-ului temporar:', error);
    }
    
    // Construiește URL-ul de verificare
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost'}/verify-email?token=${token}`;
    
    // Construiește șablonul de email
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Verifică-ți adresa de email pentru bossme.me</h2>
        <p>Salut ${user.username},</p>
        <p>Îți mulțumim pentru înregistrare! Te rugăm să confirmi adresa de email făcând clic pe butonul de mai jos:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verifică adresa de email</a>
        </div>
        <p>Sau copiază și lipește următorul link în browser-ul tău:</p>
        <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>Acest link va expira în 24 de ore.</p>
        <p>Dacă nu tu ai creat acest cont, te rugăm să ignori acest email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #777; font-size: 12px; text-align: center;">© bossme.me. Toate drepturile rezervate.</p>
      </div>
    `;
    
    // Trimite email-ul
    const result = await sendEmail({
      to: user.email,
      subject: 'Verifică-ți adresa de email pentru bossme.me',
      html: emailTemplate
    });
    
    if (result.success) {
      console.log('Email de verificare trimis cu succes la:', user.email);
    } else {
      console.error('Eroare la trimiterea email-ului de verificare:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Eroare la trimiterea email-ului de verificare:', error);
    return { success: false, error };
  }
};

// Exportă funcțiile pentru a fi folosite în alte module
module.exports = {
  sendEmail,
  sendVerificationEmail
}; 