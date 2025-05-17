const config = require('../config');

// Custom CORS middleware to handle credentials properly
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = config.corsConfig.allowedOrigins.filter(origin => origin !== '*');
  const origin = req.headers.origin;
  
  // Verificăm dacă este un crawler de rețele sociale
  const userAgent = req.headers['user-agent'] || '';
  const isWhatsAppCrawler = userAgent.includes('WhatsApp');
  const isTwitterCrawler = userAgent.includes('Twitterbot') || userAgent.includes('Twitter');
  const isFacebookCrawler = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebook');
  const isSocialCrawler = isWhatsAppCrawler || isTwitterCrawler || isFacebookCrawler || userAgent.includes('bot');
  
  // Pentru crawlere de rețele sociale, permitem accesul și adăugăm headere specifice
  if (isSocialCrawler) {
    console.log('Social crawler detected:', userAgent);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Headere comune pentru toate tipurile de crawlere
    res.header('Cache-Control', 'public, max-age=300');
    res.header('X-Robots-Tag', 'all');
    
    // Headere specifice pentru WhatsApp
    if (isWhatsAppCrawler) {
      res.header('X-WhatsApp-Crawler', 'allow');
      res.header('X-Image-Max-Preview', 'large');
    }
    
    // Headere specifice pentru Twitter/X
    if (isTwitterCrawler) {
      res.header('X-Twitter-Image-Access', 'allow');
      res.header('X-Twitter-Crawler', 'allow');
    }
    
    // Nu continuăm cu algoritmul de CORS, permitem accesul
    return next();
  }
  
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
  // Verifică dacă requestul vine de la crawler
  const userAgent = req.headers['user-agent'] || '';
  const isWhatsAppCrawler = userAgent.includes('WhatsApp');
  const isTwitterCrawler = userAgent.includes('Twitterbot') || userAgent.includes('Twitter');
  const isFacebookCrawler = userAgent.includes('facebookexternalhit') || userAgent.includes('Facebook');
  const isSocialCrawler = isWhatsAppCrawler || isTwitterCrawler || isFacebookCrawler || userAgent.includes('bot');
  
  // Pentru accesarea imaginilor, permitem accesul de la orice origine
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD');
  
  // Setăm header-ul Cross-Origin-Resource-Policy pentru a permite 
  // accesul cross-origin la resurse
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Permite încărcarea imaginilor de pe imgflip.com și alte domenii externe
  res.header('Content-Security-Policy', "img-src * 'self' https://*.imgflip.com data:;");
  
  // Dacă este un crawler social, folosim cache public pentru a permite
  // încărcarea și procesarea corectă a imaginilor
  if (isSocialCrawler) {
    // Log detection pentru debugging
    console.log('Social crawler accessing static file:', req.url);
    console.log('User-Agent:', userAgent);
    
    // Permitem caching pentru perioada scurtă pentru crawlere
    res.header('Cache-Control', 'public, max-age=300');
    res.header('X-Robots-Tag', 'all');
    
    // Headere specifice pentru WhatsApp
    if (isWhatsAppCrawler) {
      res.header('X-WhatsApp-Crawler', 'allow');
      res.header('X-Image-Max-Preview', 'large');
      console.log('WhatsApp crawler detected, optimizing response');
    }
    
    // Headere specifice pentru Twitter/X
    if (isTwitterCrawler) {
      res.header('X-Twitter-Image-Access', 'allow');
      res.header('X-Twitter-Crawler', 'allow');
      console.log('Twitter crawler detected, optimizing response');
    }
    
    // Headere specifice pentru Facebook
    if (isFacebookCrawler) {
      console.log('Facebook crawler detected, optimizing response');
    }
  } else {
    // Dezactivăm cache-ul pentru utilizatori normali pentru a forța reîncărcarea
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