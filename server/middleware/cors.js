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
    // Verificăm dacă este un request de la WhatsApp crawler bazat pe User-Agent
    const userAgent = req.headers['user-agent'] || '';
    
    if (userAgent.includes('WhatsApp')) {
      // Permitem accesul pentru crawler-ul WhatsApp
      console.log('WhatsApp crawler detected:', userAgent);
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD');
      
      // Nu continuăm cu algoritmul de CORS, permitem accesul
      return next();
    }
    
    // Pentru alte origini nepermise, returnăm 403 Forbidden
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
  
  // Verifică dacă requestul vine de la WhatsApp crawler
  const userAgent = req.headers['user-agent'] || '';
  const isWhatsAppCrawler = userAgent.includes('WhatsApp');
  
  // Pentru accesarea imaginilor de către crawlerele rețelelor sociale,
  // permitem accesul de la orice origine
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD');
  
  // Setăm header-ul Cross-Origin-Resource-Policy pentru a permite 
  // accesul cross-origin la resurse (necesar pentru Facebook, Twitter, etc.)
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Headerele necesare pentru Twitter/X card crawler
  res.header('X-Twitter-Image-Access', 'allow');
  res.header('X-Robots-Tag', 'all');
  res.header('X-Twitter-Crawler', 'allow');
  
  // Headere specifice pentru WhatsApp crawler
  if (isWhatsAppCrawler) {
    res.header('X-WhatsApp-Crawler', 'allow');
    res.header('X-Image-Max-Preview', 'large');
    // WhatsApp necesită un cache mai relaxat pentru a putea recupera imaginile
    res.header('Cache-Control', 'public, max-age=300');
  } else {
    // Dezactivăm cache-ul pentru a forța reîncărcarea imaginilor pentru alte platforme
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }
  
  next();
};

module.exports = {
  corsMiddleware,
  staticFilesCorsMiddleware
}; 