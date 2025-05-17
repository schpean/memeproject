const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

// Încarcă explicit variabilele de mediu din fișierul .env din rădăcină
const dotenvPath = path.resolve(__dirname, '../.env');
console.log('Calea către .env:', dotenvPath);
console.log('Fișierul .env există:', fs.existsSync(dotenvPath) ? 'Da' : 'Nu');
require('dotenv').config({ path: dotenvPath });

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const emailService = require('./email');
const config = require('./config');
const http = require('http');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const updatesRoutes = require('./routes/updates');
const memesRoutes = require('./routes/memes');
const commentsRoutes = require('./routes/comments');
const { authorize } = require('./middleware/auth');
const checkUserStatus = require('./middleware/checkUserStatus');
const WebSocketHandler = require('./websocket/websocketHandler');
const broadcastService = require('./websocket/broadcastService');
const { corsMiddleware, staticFilesCorsMiddleware } = require('./middleware/cors');

const app = express();
const port = config.port;

// Create an HTTP server instance
const server = http.createServer(app);

// Initialize WebSocket
const websocketHandler = new WebSocketHandler(server);
broadcastService.setWebSocketHandler(websocketHandler);

// Apply custom CORS middleware
app.use(corsMiddleware);
app.use(express.json());

// Creează directorul images dacă nu există
const imagesDir = path.join(__dirname, 'uploads/images');
if (!fs.existsSync(imagesDir)) {
  console.log('Creez directorul pentru imagini:', imagesDir);
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Detectează tipul de crawler bazat pe User-Agent
const detectCrawler = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const isWhatsAppCrawler = userAgent.includes('WhatsApp');
  const isTwitterCrawler = userAgent.includes('Twitterbot') || userAgent.includes('Twitter');
  const isFacebookCrawler = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebook');
  
  if (isWhatsAppCrawler) return 'whatsapp';
  if (isTwitterCrawler) return 'twitter';
  if (isFacebookCrawler) return 'facebook';
  if (userAgent.includes('bot')) return 'bot';
  return null;
};

// Add CORS headers for static files
app.use('/uploads', staticFilesCorsMiddleware, express.static(path.join(__dirname, 'uploads'), {
  maxAge: '0', // Oprim cache-ul pentru a forța reîncărcarea imaginilor
  etag: false, // Dezactivăm etags pentru a preveni caching-ul
  lastModified: false, // Dezactivăm lastModified pentru a preveni caching-ul
  setHeaders: (res, filePath, stat) => {
    // Detectăm tipul de crawler
    const req = res.req;
    const crawlerType = detectCrawler(req);
    
    // Permite accesul cross-origin pentru imagini (esențial pentru Facebook OG și alte platforme)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 ore
    
    // Permite încărcarea imaginilor de pe imgflip.com și alte domenii externe
    res.setHeader('Content-Security-Policy', "img-src * 'self' https://*.imgflip.com data:;");
    
    if (crawlerType) {
      console.log(`${crawlerType.toUpperCase()} crawler detected for:`, req.url);
      
      // Un cache mai relaxat pentru crawlere ca să poată procesa și afișa imaginile
      res.setHeader('Cache-Control', 'public, max-age=300');
      
      // Header-uri comune pentru toate crawler-ele
      res.setHeader('X-Robots-Tag', 'all');
      
      // Header-uri specifice pentru diferite platforme
      if (crawlerType === 'whatsapp') {
        res.setHeader('X-WhatsApp-Crawler', 'allow');
        res.setHeader('X-Image-Max-Preview', 'large');
      } else if (crawlerType === 'twitter') {
        res.setHeader('X-Twitter-Image-Access', 'allow');
        res.setHeader('X-Twitter-Crawler', 'allow');
      }
    } else {
      // Prevenim cache-ul complet pentru utilizatori normali
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Header-uri pentru a asigura că imaginile sunt accesibile de la orice origine
    res.setHeader('Timing-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Adăugăm Content-Type corect pentru imagini
    const ext = path.extname(req.path).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// Servim imaginile statice din public/images pentru a avea acces la imaginile de fallback
app.use('/images', staticFilesCorsMiddleware, express.static(path.join(__dirname, '../public/images'), {
  maxAge: '7d', // Cachează imaginile statice pentru o săptămână
  etag: true,
  setHeaders: (res, filePath, stat) => {
    // Detectăm tipul de crawler
    const req = res.req;
    const crawlerType = detectCrawler(req);
    
    // Permiterea accesului cross-origin pentru imagini
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (crawlerType) {
      // Cache relaxat pentru crawlere
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  }
}));

// Servim și imaginile din public direct pentru a asigura accesul la web-app-manifest
app.use(staticFilesCorsMiddleware, express.static(path.join(__dirname, '../public'), {
  maxAge: '7d',
  etag: true,
  setHeaders: (res, filePath, stat) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Use routes
app.use('/users', authRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/memes', memesRoutes);
app.use('/memes', commentsRoutes);

// Rutele pentru meme-uri și comentarii au fost mutate în:
// - /routes/memes.js - toate rutele pentru meme-uri
// - /routes/comments.js - toate rutele pentru comentarii

// Add a status endpoint for debugging
app.get('/api/status', async (req, res) => {
  try {
    // Check database connection
    const dbConnection = await pool.query('SELECT NOW() as time');
    
    // Check if users table exists
    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists;
    `);
    
    // Check if nickname_changed column exists
    const nicknameColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'nickname_changed'
      ) as exists;
    `);
    
    // Return status information
    res.json({
      status: 'ok',
      time: dbConnection.rows[0].time,
      tables: {
        users: usersTable.rows[0].exists,
        nickname_changed: nicknameColumn.rows[0].exists
      },
      environment: {
        node: process.version,
        port: port
      }
    });
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Use HTTP server with WebSocket support
server.listen(port, async () => {
  try {
    // Verifică conexiunea la bază
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database. Server will continue but might not work correctly.');
    }
    
    console.log(`🚀 Server is running on port ${port}`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
  }
});

// Database connection check
const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};