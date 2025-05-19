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
  
  // Log mai detaliat pentru debugging
  if (userAgent.toLowerCase().includes('bot') || 
      userAgent.toLowerCase().includes('whatsapp') || 
      userAgent.toLowerCase().includes('facebook') || 
      userAgent.toLowerCase().includes('messenger') ||
      userAgent.toLowerCase().includes('twitter') ||
      userAgent.toLowerCase().includes('twitterbot') ||
      userAgent.toLowerCase().includes('electron')) {
    console.log('🔍 Crawler detected - Full User-Agent:', userAgent);
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  }
  
  // WhatsApp are mai multe variante de User-Agent
  const isWhatsAppCrawler = userAgent.toLowerCase().includes('whatsapp') || 
                           req.query._platform === 'whatsapp' ||
                           (userAgent.toLowerCase().includes('electron') && req.query._platform === 'whatsapp');
  const isTwitterCrawler = userAgent.toLowerCase().includes('twitterbot') || 
                          userAgent.toLowerCase().includes('twitter') ||
                          req.query._platform === 'twitter';
  const isFacebookCrawler = userAgent.toLowerCase().includes('facebookexternalhit') ||
                           userAgent.toLowerCase().includes('messenger') ||
                           userAgent.toLowerCase().includes('facebook') ||
                           req.query._platform === 'facebook' ||
                           req.query._platform === 'messenger';
  const isGenericBot = (userAgent.toLowerCase().includes('bot') || 
                       userAgent.toLowerCase().includes('crawler')) && 
                       !isWhatsAppCrawler && 
                       !isTwitterCrawler && 
                       !isFacebookCrawler;
  
  if (isWhatsAppCrawler) {
    // Detectăm dacă este WhatsApp Desktop sau Mobile
    const isDesktop = userAgent.toLowerCase().includes('electron') || 
                     userAgent.toLowerCase().includes('windows') || 
                     userAgent.toLowerCase().includes('macos');
    console.log('✅ Detected WhatsApp crawler - Desktop:', isDesktop ? 'Yes' : 'No');
    return isDesktop ? 'whatsapp-desktop' : 'whatsapp';
  }
  if (isTwitterCrawler) {
    console.log('✅ Detected Twitter crawler');
    return 'twitter';
  }
  if (isFacebookCrawler) {
    console.log('✅ Detected Facebook crawler');
    // Verificăm dacă este Messenger specific
    if (userAgent.toLowerCase().includes('messenger') || req.query._platform === 'messenger') {
      console.log('✅ Specifically detected Messenger crawler');
      return 'messenger';
    }
    return 'facebook';
  }
  if (isGenericBot) {
    console.log('✅ Detected generic bot crawler');
    return 'bot';
  }
  return null;
};

// Middleware special pentru a gestiona request-urile platformelor sociale
// și a afișa meta tag-urile corecte
app.use(async (req, res, next) => {
  const crawlerType = detectCrawler(req);
  
  // Adăugăm headere comune pentru toate request-urile
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Dacă nu este crawler, continuă normal dar cu header-e relaxate
  if (!crawlerType) {
    return next();
  }
  
  console.log(`[${crawlerType.toUpperCase()}] Crawler accessing path:`, req.path);
  
  // Verifică dacă este o pagină de meme specifică
  const memeMatch = req.path.match(/^\/meme\/(\d+)/);
  if (memeMatch) {
    const memeId = memeMatch[1];
    console.log(`[${crawlerType.toUpperCase()}] Crawler accessing meme page id: ${memeId}`);
    
    try {
      // Obține datele meme-ului direct din baza de date
      const memeResult = await pool.query('SELECT * FROM memes WHERE id = $1', [memeId]);
      const meme = memeResult.rows[0];
      
      if (meme) {
        console.log(`[${crawlerType.toUpperCase()}] Found meme:`, meme.title || 'No title');
        
        // Construiește URL-ul complet pentru imagine
        let imageUrl = meme.image_url || meme.imageUrl;
        const baseUrl = req.protocol + '://' + req.get('host');
        
        // Verifică și asigură-te că URL-ul imaginii este complet
        if (imageUrl) {
          // Detectează și evită url-urile de la imgur
          if (imageUrl.includes('imgur')) {
            console.log(`[${crawlerType.toUpperCase()}] Replacing imgur URL with fallback`);
            imageUrl = `${baseUrl}/images/web-app-manifest-512x512.png`;
          } 
          // Asigură-te că URL-ul este absolut
          else if (!imageUrl.startsWith('http')) {
            imageUrl = baseUrl + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
          }
          
          // Adaugă timestamp pentru cache busting
          const timestamp = new Date().getTime();
          imageUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + timestamp + '&_nocache=1';
          
          // Adaugă parametri specifici pentru WhatsApp Desktop
          if (crawlerType === 'whatsapp-desktop') {
            imageUrl += '&_client=desktop';
          }
          
          console.log(`[${crawlerType.toUpperCase()}] Using image URL:`, imageUrl);
        } else {
          // Folosește imaginea fallback
          imageUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${new Date().getTime()}&_nocache=1`;
          console.log(`[${crawlerType.toUpperCase()}] Using fallback image:`, imageUrl);
        }
        
        // Construiește titlul
        const title = meme.title || `${meme.company}'s review meme | bossme.me`;
        
        // Titlu simplificat pentru toate platformele
        const simplifiedTitle = 'bossme.me';
        
        // Construiește descrierea
        let description = `Check out this meme about ${meme.company || 'workplace'}`;
        if (meme.message) {
          const truncatedMessage = meme.message.length > 120 
            ? meme.message.substring(0, 120) + '...' 
            : meme.message;
          description += `: ${truncatedMessage}`;
        }
        
        // Descriere simplificată pentru toate platformele
        let simplifiedDescription = 'bossme.me';
        
        // Servește HTML special pentru crawler-ele social media
        if (crawlerType === 'twitter' || 
            crawlerType === 'facebook' || 
            crawlerType === 'messenger' ||
            crawlerType === 'whatsapp' || 
            crawlerType === 'whatsapp-desktop') {
          
          // Headere pentru crawlere
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.setHeader('X-Robots-Tag', 'all');
          
          // Headere specifice pentru diferite platforme
          if (crawlerType === 'whatsapp' || crawlerType === 'whatsapp-desktop') {
            res.setHeader('X-WhatsApp-Crawler', 'allow');
            res.setHeader('X-Image-Max-Preview', 'large');
            console.log('✅ WhatsApp headers set for meme page:', req.path);
            
            // Headere suplimentare pentru WhatsApp Desktop
            if (crawlerType === 'whatsapp-desktop') {
              res.setHeader('X-WhatsApp-Desktop', 'true');
              res.setHeader('Sec-Fetch-Mode', 'cors');
              res.setHeader('Sec-Fetch-Dest', 'image');
              console.log('✅ WhatsApp Desktop specific headers added');
            }
          } else if (crawlerType === 'twitter') {
            res.setHeader('X-Twitter-Image-Access', 'allow');
            res.setHeader('X-Twitter-Crawler', 'allow');
            res.setHeader('X-Twitter-Card', 'summary_large_image');
            console.log('✅ Twitter headers set for meme page:', req.path);
          } else if (crawlerType === 'facebook' || crawlerType === 'messenger') {
            res.setHeader('X-Facebook-Crawler', 'allow');
            console.log('✅ Facebook headers set for meme page:', req.path);
            
            if (crawlerType === 'messenger') {
              res.setHeader('X-Messenger-Crawler', 'allow');
              // Forțează expiarea cache-ului pentru Messenger
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
              res.setHeader('Surrogate-Control', 'no-store');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              console.log('✅ Messenger specific headers added with aggressive cache busting');
            }
          }
          
          // Citește fișierul index.html pentru a-l modifica
          const indexPath = path.join(__dirname, '../build', 'index.html');
          fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) {
              console.error('❌ Error reading index.html:', err);
              return next();
            }
            
            // Înlocuiește meta tag-urile cu cele specifice pentru meme
            let htmlWithMeta = data;
            
            // Înlocuiește titlul
            // Pentru toate platformele folosim un titlu simplificat
            htmlWithMeta = htmlWithMeta.replace(/<title>.*?<\/title>/, `<title>${simplifiedTitle}</title>`);
            
            // Înlocuiește meta tag-urile pentru Twitter și OG
            const metaReplacements = [
              // Meta pentru titlu
              { pattern: /<meta property="og:title"[^>]*>/, replacement: `<meta property="og:title" content="${simplifiedTitle}">` },
              { pattern: /<meta name="twitter:title"[^>]*>/, replacement: `<meta name="twitter:title" content="${simplifiedTitle}">` },
              
              // Meta pentru descriere
              { pattern: /<meta property="og:description"[^>]*>/, replacement: `<meta property="og:description" content="${simplifiedDescription}">` },
              { pattern: /<meta name="twitter:description"[^>]*>/, replacement: `<meta name="twitter:description" content="${simplifiedDescription}">` },
              { pattern: /<meta name="description"[^>]*>/, replacement: `<meta name="description" content="${simplifiedDescription}">` },
              
              // Meta pentru imagine
              { pattern: /<meta property="og:image"[^>]*>/, replacement: `<meta property="og:image" content="${imageUrl}">` },
              { pattern: /<meta property="og:image:secure_url"[^>]*>/, replacement: `<meta property="og:image:secure_url" content="${imageUrl}">` },
              { pattern: /<meta property="og:image:url"[^>]*>/, replacement: `<meta property="og:image:url" content="${imageUrl}">` },
              { pattern: /<meta name="twitter:image"[^>]*>/, replacement: `<meta name="twitter:image" content="${imageUrl}">` },
              { pattern: /<meta name="twitter:image:src"[^>]*>/, replacement: `<meta name="twitter:image:src" content="${imageUrl}">` },
              
              // Meta pentru dimensiuni imagini - maxime pentru toate platformele
              { pattern: /<meta property="og:image:width"[^>]*>/, replacement: `<meta property="og:image:width" content="1200">` },
              { pattern: /<meta property="og:image:height"[^>]*>/, replacement: `<meta property="og:image:height" content="630">` },
              
              // WhatsApp specific meta tags
              { pattern: /<meta property="whatsapp:image"[^>]*>/, replacement: `<meta property="whatsapp:image" content="${imageUrl}">` },
              { pattern: /<meta property="whatsapp:title"[^>]*>/, replacement: `<meta property="whatsapp:title" content="${simplifiedTitle}">` },
              { pattern: /<meta property="whatsapp:description"[^>]*>/, replacement: `<meta property="whatsapp:description" content="${simplifiedDescription}">` },
              
              // WhatsApp specific dimensions
              { pattern: /<meta property="whatsapp:image:width"[^>]*>/, replacement: `<meta property="whatsapp:image:width" content="1200">` },
              { pattern: /<meta property="whatsapp:image:height"[^>]*>/, replacement: `<meta property="whatsapp:image:height" content="630">` },
              
              // Facebook specifics - corectăm ID-ul de aplicație
              { pattern: /<meta property="fb:app_id"[^>]*>/, replacement: `<meta property="fb:app_id" content="1219609932336050">` },
              
              // Meta pentru tipul de conținut
              { pattern: /<meta property="og:type"[^>]*>/, replacement: `<meta property="og:type" content="article">` },
              { pattern: /<meta property="og:url"[^>]*>/, replacement: `<meta property="og:url" content="${baseUrl}/meme/${memeId}">` },
              
              // Aspect ratio pentru Twitter Card
              { pattern: /<meta name="twitter:card"[^>]*>/, replacement: `<meta name="twitter:card" content="summary_large_image">` },
            ];
            
            // Aplică toate înlocuirile
            metaReplacements.forEach(replacement => {
              htmlWithMeta = htmlWithMeta.replace(replacement.pattern, replacement.replacement);
            });
            
            // Adaugă meta tag pentru timpul actualizării pentru a preveni caching-ul
            const updateTimeTag = `<meta property="og:updated_time" content="${new Date().toISOString()}">`;
            htmlWithMeta = htmlWithMeta.replace('</head>', `${updateTimeTag}</head>`);
            
            // Adaugă meta tag-uri specifice pentru Facebook și Messenger
            const socialOptimizationTags = `
              <!-- Social optimization tags -->
              <meta property="og:image:ratio" content="1.91">
              <meta property="og:image:aspect_ratio" content="1.91">
              <meta property="og:site_name" content="bossme.me">
              <meta property="og:image:type" content="image/jpeg">
              <meta property="og:rich_attachment" content="true">
              <meta property="og:image:width:min" content="1200">
              <meta property="og:image:height:min" content="630">
            `;
            htmlWithMeta = htmlWithMeta.replace('</head>', `${socialOptimizationTags}</head>`);
            console.log('✅ Added image optimization meta tags');
            
            // Dacă este Messenger, adaugă tag-uri speciale pentru Messenger
            if (crawlerType === 'messenger') {
              // Corectări pentru optimizarea preview-urilor pe Messenger ca cele de pe platforme populare de social media
              const messengerSpecificTags = `
                <!-- Messenger special preview optimization -->
                <meta property="og:image:secure_url" content="${imageUrl}">
                <meta property="og:image:url" content="${imageUrl}">
                <meta property="og:image:alt" content="bossme.me meme">
                <meta property="og:url" content="${baseUrl}/meme/${memeId}">
                <meta property="og:image:width" content="1080">
                <meta property="og:image:height" content="1080">
                <meta property="og:see_also" content="${baseUrl}">
                <meta property="og:image:user_generated" content="true">
                <meta property="al:android:url" content="${baseUrl}/meme/${memeId}">
                <meta property="al:ios:url" content="${baseUrl}/meme/${memeId}">
                <meta property="og:video:tag" content="meme">
                <link rel="image_src" href="${imageUrl}">
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${messengerSpecificTags}</head>`);
              console.log('✅ Added special Messenger preview optimization');
              
              // Adaugă script special pentru Messenger
              const messengerScript = `
                <script>
                  // Script pentru optimizarea preview-urilor Messenger
                  window.fbAsyncInit = function() {
                    FB.init({
                      appId: '1219609932336050',
                      autoLogAppEvents: true,
                      xfbml: true,
                      version: 'v17.0'
                    });
                  };
                </script>
                <script async defer src="https://connect.facebook.net/en_US/sdk.js"></script>
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${messengerScript}</head>`);
              
              // Injectează CSS pentru a forța imaginea la dimensiune maximă (similar cu platformele populare de social media)
              const inlineCSS = `
                <style>
                  .og-image {
                    width: 100%;
                    max-width: 100%;
                    height: auto;
                    border-radius: 0;
                    margin: 0;
                    padding: 0;
                  }
                  
                  /* Optimizat pentru preview-uri Messenger */
                  [data-scribe="element:card_image"] {
                    width: 100% !important;
                    height: auto !important;
                    max-width: 100% !important;
                    max-height: none !important;
                    border-radius: 0 !important;
                  }
                </style>
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${inlineCSS}</head>`);
              
              // Adaugă codul pentru preîncărcare agresivă a imaginii
              const imagePreloadCode = `
                <script>
                  // Forțăm încărcarea imaginii pentru a fi disponibilă crawler-ului Messenger
                  document.addEventListener('DOMContentLoaded', function() {
                    var img = new Image();
                    img.src = '${imageUrl}';
                    img.onload = function() {
                      // Adăugăm imaginea direct în DOM pentru a fi siguri că e vizibilă pentru crawler
                      var preloadDiv = document.createElement('div');
                      preloadDiv.style.position = 'absolute';
                      preloadDiv.style.top = '0';
                      preloadDiv.style.left = '0';
                      preloadDiv.style.width = '100%';
                      preloadDiv.style.zIndex = '9999';
                      preloadDiv.style.boxSizing = 'border-box';
                      preloadDiv.style.backgroundColor = '#fff';
                      
                      var imgElement = document.createElement('img');
                      imgElement.src = '${imageUrl}';
                      imgElement.style.width = '100%';
                      imgElement.style.height = 'auto';
                      imgElement.alt = 'bossme.me meme';
                      imgElement.className = 'og-image';
                      
                      preloadDiv.appendChild(imgElement);
                      document.body.insertBefore(preloadDiv, document.body.firstChild);
                      
                      // Adăugăm și un script care forțează reîncărcarea paginii dacă crawler-ul Facebook a ratat imaginea
                      if (navigator.userAgent.indexOf('facebookexternalhit') > -1 || 
                          navigator.userAgent.indexOf('Messenger') > -1 || 
                          document.referrer.indexOf('facebook.com') > -1 ||
                          document.referrer.indexOf('messenger.com') > -1) {
                        // Forțăm refresh dacă imaginea nu a fost încărcată în 500ms
                        setTimeout(function() {
                          if (!imgElement.complete || imgElement.naturalWidth === 0) {
                            window.location.reload();
                          }
                        }, 500);
                      }
                    };
                  });
                </script>
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${imagePreloadCode}</head>`);
              
              // Debug helper - pentru a detecta când crawler-ul vine
              const debugScript = `
                <script>
                  // Pentru debugging
                  console.log('User-Agent:', navigator.userAgent);
                  if (navigator.userAgent.indexOf('facebookexternalhit') > -1 || 
                      navigator.userAgent.indexOf('Messenger') > -1) {
                    console.log('Facebook/Messenger crawler detected!');
                  }
                </script>
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${debugScript}</head>`);
            }
            
            // Adaugă un script special pentru WhatsApp Desktop care forțează preview-ul
            if (crawlerType === 'whatsapp-desktop') {
              const whatsappDesktopScript = `
                <script>
                window.onload = function() {
                  // Crează un element link preview pentru WhatsApp Desktop
                  var linkPreview = document.createElement('div');
                  linkPreview.className = 'whatsapp-preview';
                  linkPreview.style.display = 'block';
                  linkPreview.style.width = '100%';
                  linkPreview.style.maxWidth = '600px';
                  linkPreview.style.margin = '20px auto';
                  linkPreview.style.padding = '10px';
                  linkPreview.style.border = '1px solid #e2e2e2';
                  linkPreview.style.borderRadius = '8px';
                  linkPreview.style.backgroundColor = '#fff';
                  
                  // Adaugă imaginea
                  var img = document.createElement('img');
                  img.src = '${imageUrl}';
                  img.alt = '${simplifiedTitle}';
                  img.style.width = '100%';
                  img.style.maxHeight = '300px';
                  img.style.objectFit = 'contain';
                  linkPreview.appendChild(img);
                  
                  // Adaugă titlul
                  var titleEl = document.createElement('h3');
                  titleEl.textContent = '${simplifiedTitle}';
                  titleEl.style.margin = '10px 0';
                  titleEl.style.color = '#333';
                  linkPreview.appendChild(titleEl);
                  
                  // Adaugă la pagină
                  document.body.insertBefore(linkPreview, document.body.firstChild);
                };
                </script>
              `;
              htmlWithMeta = htmlWithMeta.replace('</head>', `${whatsappDesktopScript}</head>`);
              console.log('✅ Added WhatsApp Desktop custom preview script');
            }
            
            // Adaugă un script special pentru force loading imagine pentru toate platformele
            const forceImageLoadScript = `
              <script>
                // Forțăm preîncărcarea imaginii
                (function() {
                  var img = new Image();
                  img.src = '${imageUrl}';
                  img.onload = function() {
                    console.log('Image preloaded successfully');
                  };
                  img.onerror = function() {
                    console.error('Error preloading image');
                  };
                })();
              </script>
            `;
            htmlWithMeta = htmlWithMeta.replace('</head>', `${forceImageLoadScript}</head>`);
            console.log('✅ Added force image loading script');
            
            console.log(`[${crawlerType.toUpperCase()}] Serving custom meta tags for meme ${memeId}`);
            res.send(htmlWithMeta);
          });
          return; // Oprește procesarea aici, nu merge la next()
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching meme for crawler:`, error);
    }
  } else if (req.path.startsWith('/uploads/') || req.path.startsWith('/images/')) {
    // Setăm header-uri pentru acces la resursele de imagine
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300');
    console.log(`[${crawlerType.toUpperCase()}] Crawler accessing image:`, req.path);
  }
  
  // Continuă spre următorul middleware
  next();
});

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