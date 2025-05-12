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

// Add CORS headers for static files
app.use('/uploads', staticFilesCorsMiddleware, express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', express.static('uploads'));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

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