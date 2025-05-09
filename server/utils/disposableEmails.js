/**
 * Listă de domenii de email temporare cunoscute
 * Această listă completează librăria disposable-email-detector
 * pentru a ne asigura că nu ratăm niciun domeniu temporar
 */

// Lista de domenii temporare cunoscute
const DISPOSABLE_EMAIL_DOMAINS = [
  // Domenii temp-mail.org și similare
  'agiuse.com',
  'emlhub.com',
  'tmpbox.net',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.de',
  'sharklasers.com',
  'grr.la',
  'pokemail.net',

  // Domenii mailinator
  'mailinator.com',
  'mailinator.net',
  'maildrop.cc',
  'harakirimail.com',

  // 10 Minute Mail și similare
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.org',
  'minutemail.com',
  'tempmail.com',
  'tempmailo.com',
  'tempmail.io',
  'tempmail.net',
  'tempmail.org',
  'tempmail.space',
  'tempmail.top',
  'tempmail.xyz',
  
  // Alte servicii populare
  'yopmail.com',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.org',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'discardmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'dispostable.com',
  'tempinbox.com',
  'spamgourmet.com',
  'mailcatch.com',
  'getairmail.com',
  'getnada.com',
  'inboxalias.com',
  'tempr.email',
  'discard.email',
  'emailfake.com',
  'fakeinbox.com',
  'cs.email',
  'mohmal.com',
  'incognitomail.com',
  'tempmailo.com',
  'emailondeck.com',
  'temp-mail.io',
  '1secmail.com',
  'email-generator.com',
  'forwarding-page-3949.herokuapp.com',
  'disposableemail.com',
  'emailtemporal.org'
];

/**
 * Verifică dacă un email este temporar/de unică folosință
 * @param {string} email - Adresa de email de verificat
 * @returns {boolean} - true dacă email-ul este temporar, false în caz contrar
 */
function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Extrag domeniul din email
  const emailParts = email.split('@');
  if (emailParts.length !== 2) {
    return false;
  }

  const domain = emailParts[1].toLowerCase();

  // Verifică dacă domeniul este în lista noastră
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

module.exports = {
  isDisposableEmail,
  DISPOSABLE_EMAIL_DOMAINS
}; 