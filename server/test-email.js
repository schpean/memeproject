/**
 * Test Email Sender pentru bossme.me
 * 
 * Acest script testează funcționalitatea de email prin trimiterea de emailuri de test către o adresă verificată.
 * Asigură-te că ai actualizat variabila TEST_EMAIL_ADDRESS cu o adresă validă.
 * 
 * Utilizare:
 * - node server/test-email.js
 */

// Încarcă path pentru rezolvarea căilor
const path = require('path');
const dotenvPath = path.resolve(__dirname, '../.env');
console.log('Calea către .env:', dotenvPath);
console.log('Fișierul .env există:', require('fs').existsSync(dotenvPath) ? 'Da' : 'Nu');

require('dotenv').config({ path: dotenvPath });

// Forțează variabilele de mediu dacă nu sunt încărcate corect
if (!process.env.EMAIL_HOST) {
  console.log('⚠️ Variabilele de email nu au fost încărcate din .env, se folosesc valorile hard-coded pentru test');
  process.env.EMAIL_HOST = 'smtp.zoho.eu';
  process.env.EMAIL_PORT = '465';
  process.env.EMAIL_USER = 'no-reply@bossme.me';
  process.env.EMAIL_PASS = 'Mollylittle2003.';
  process.env.EMAIL_FROM = 'no-reply@bossme.me';
  process.env.EMAIL_SECURE = 'true';
}

// Asigură-te că EMAIL_SECURE este convertit la boolean
process.env.EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';

// Debug info - verifică valorile din .env direct
console.log('==== Variabile de mediu pentru Email ====');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS set?', !!process.env.EMAIL_PASS);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
console.log('=======================================');

// Importă serviciul de email (folosind CommonJS)
const emailService = require('./email');

// ⚠️ IMPORTANT: Folosește o adresă de email verificată
const TEST_EMAIL_ADDRESS = 'mateas.bogdan@gmail.com'; // Înlocuiește cu adresa ta de email

// Obiectul utilizator de test
const testUser = {
  email: TEST_EMAIL_ADDRESS,
  nickname: 'Tester Alpha'
};

// Tokeni de test pentru verificare și resetare
const MOCK_VERIFICATION_TOKEN = 'test-verification-token-12345';
const MOCK_RESET_TOKEN = 'test-reset-token-12345';

// Utilitar pentru formatarea output-ului în consolă
const formatOutput = (success, message) => {
  return success ? `✅ ${message}` : `❌ ${message}`;
};

// Funcția principală de testare
async function runTests() {
  console.log('=============================================');
  console.log('🧪 ÎNCEPERE TESTARE EMAIL PENTRU ALPHA');
  console.log('=============================================');
  console.log(`📧 Se folosește adresa de test: ${TEST_EMAIL_ADDRESS}`);
  console.log('---------------------------------------------');

  let allTestsPassed = true;
  
  try {
    // Verifică conexiunea la serviciul de email
    console.log('Se verifică conexiunea la serviciul de email...');
    const connectionResult = await emailService.verifyEmailConfig();
    const success = connectionResult === true;
    console.log(formatOutput(success, 'Test conexiune serviciu email'));
    
    if (!success) {
      throw new Error(`Conexiunea la serviciul de email a eșuat`);
    }
    
    // Testează emailul de bun venit
    console.log('\nSe testează emailul de bun venit...');
    await emailService.sendWelcomeEmail(testUser);
    console.log(formatOutput(true, 'Test email bun venit'));
    
    // Testează emailul de verificare
    console.log('\nSe testează emailul de verificare...');
    await emailService.sendVerificationEmail(testUser, MOCK_VERIFICATION_TOKEN);
    console.log(formatOutput(true, 'Test email verificare'));
    
    // Testează emailul de resetare parolă (dacă funcția există)
    if (typeof emailService.sendPasswordResetEmail === 'function') {
      console.log('\nSe testează emailul de resetare parolă...');
      await emailService.sendPasswordResetEmail(testUser, MOCK_RESET_TOKEN);
      console.log(formatOutput(true, 'Test email resetare parolă'));
    } else {
      console.log('\n⚠️ Testul pentru emailul de resetare parolă a fost omis (funcția nu este implementată încă)');
    }
    
    console.log('\n---------------------------------------------');
    console.log('✅ Toate testele de email au fost completate cu succes!');
    
  } catch (error) {
    allTestsPassed = false;
    console.error('\n❌ Testul de email a eșuat:');
    console.error(error.message);
    
    console.log('\n📋 Sfaturi de rezolvare a problemei:');
    console.log('1. Verifică credențialele serviciului de email din fișierul .env');
    console.log('2. Asigură-te că adresa de email de test este validă');
    console.log('3. Verifică dacă serviciul de email este configurat corect');
    console.log('4. Asigură-te că serverul se poate conecta la serviciul de email (fără probleme de firewall)');
  } finally {
    console.log('\n=============================================');
    console.log(formatOutput(allTestsPassed, 'SUMAR TEST EMAIL'));
    console.log('=============================================');
    
    // Ieși cu codul adecvat
    process.exit(allTestsPassed ? 0 : 1);
  }
}

// Rulează testele
runTests(); 