const config = require('../config');

// Custom CORS middleware to handle credentials properly
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = config.corsConfig.allowedOrigins.filter(origin => origin !== '*');
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', config.corsConfig.methods.join(', '));
    res.header('Access-Control-Allow-Headers', config.corsConfig.allowedHeaders.join(', '));
  } else if (!origin || origin === 'null') {
    // Allow requests from file:// protocol or null origin
    res.header('Access-Control-Allow-Origin', 'null');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', config.corsConfig.methods.join(', '));
    res.header('Access-Control-Allow-Headers', config.corsConfig.allowedHeaders.join(', '));
  } else {
    // For non-matching origins, return a 403 Forbidden
    return res.status(403).json({ 
      error: 'CORS Error', 
      message: 'Origin not allowed', 
      origin: origin || 'undefined',
      allowedOrigins: allowedOrigins 
    });
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
};

// Middleware for static files CORS
const staticFilesCorsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = config.corsConfig.allowedOrigins.filter(origin => origin !== '*');
  
  // Pentru accesarea imaginilor de către crawlerele rețelelor sociale,
  // permitem accesul de la orice origine
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD');
  
  // Setăm header-ul Cross-Origin-Resource-Policy pentru a permite 
  // accesul cross-origin la resurse (necesar pentru Facebook, Twitter, etc.)
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Dezactivăm cache-ul pentru a forța reîncărcarea imaginilor
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  next();
};

module.exports = {
  corsMiddleware,
  staticFilesCorsMiddleware
}; 