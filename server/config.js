// Server configuration file
const path = require('path');
const fs = require('fs');

// Încarcă explicit variabilele de mediu din fișierul .env din rădăcină
const dotenvPath = path.resolve(__dirname, '../.env');
console.log('Config: Calea către .env:', dotenvPath);
console.log('Config: Fișierul .env există:', fs.existsSync(dotenvPath) ? 'Da' : 'Nu');
require('dotenv').config({ path: dotenvPath });

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
};

// Google OAuth configuration
const googleConfig = {
  clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
};

// CORS configuration
const corsConfig = {
  allowedOrigins: [
    process.env.CLIENT_BASE_URL || 'https://bossme.me',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,  // React dev server
    process.env.NODE_ENV === 'development' ? 'http://localhost:1337' : null,  // Local development
    process.env.PRODUCTION_CLIENT_URL,  // Add your production URL when deploying
    'http://86.120.25.207:1337', // Add IP-based access explicitly
    'http://bossme.me:1337',    // Add domain-based access
    'https://bossme.me:1337',   // Secure version
    'http://bossme.me',         // Without port
    'https://bossme.me',        // Secure without port
    'http://192.168.0.104:1337', // Local IP address
    'null', // For local file testing
    'http://localhost:1337' // Explicitly add localhost:1337
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'user-id']
};

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
  secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: process.env.EMAIL_FROM
};

// Server URLs
const urls = {
  client: process.env.CLIENT_BASE_URL || 'https://bossme.me',
  production: process.env.PRODUCTION_CLIENT_URL
};

module.exports = {
  dbConfig,
  googleConfig,
  corsConfig,
  emailConfig,
  urls,
  port: process.env.PORT || 1337
}; 