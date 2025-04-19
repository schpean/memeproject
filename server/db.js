const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Încarcă explicit variabilele de mediu din fișierul .env din rădăcină, dacă nu sunt deja încărcate
if (!process.env.DB_HOST) {
  const dotenvPath = path.resolve(__dirname, '../.env');
  console.log('DB: Calea către .env:', dotenvPath);
  console.log('DB: Fișierul .env există:', fs.existsSync(dotenvPath) ? 'Da' : 'Nu');
  require('dotenv').config({ path: dotenvPath });
}

// Configurația bazei de date din variabilele de mediu
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

module.exports = pool; 