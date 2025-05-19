import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Componentă optimizată pentru managementul meta tag-urilor și Open Graph
 * Facilitează partajarea optimă a conținutului pe rețelele sociale cu preview-uri mari
 * Optimizat și pentru WhatsApp, Twitter și Facebook
 */
const MetaTags = ({ 
  title, 
  description, 
  image, 
  url,
  type = 'website',
  twitterCard = 'summary_large_image',
  siteName = 'bossme.me',
  locale = 'ro_RO'
}) => {
  // Debug info pentru a verifica dacă componenta este apelată
  console.log('=== MetaTags Component Called ===');
  console.log('- Title:', title);
  console.log('- URL:', url);
  console.log('- Image input:', image);
  
  // Generăm un timestamp pentru a forța platforma socială să reincarce imaginile
  const timestamp = new Date().getTime();
  
  // Flag pentru a determina dacă folosim imagine de fallback sau o imagine reală de meme
  let isFallbackImage = false;
  
  // Detectăm platforma de partajare din URL (dacă există)
  const detectPlatform = () => {
    try {
      const urlObj = url ? new URL(url) : new URL(window.location.href);
      return urlObj.searchParams.get('_platform') || '';
    } catch (e) {
      return '';
    }
  };
  
  const sharingPlatform = detectPlatform();
  
  // Asigură-te că avem un URL complet pentru imagine
  let imageUrl;
  if (image && image.trim() !== '') {
    // Verificăm și blocăm referințele la imgur sau alte platforme externe nedorite
    if (image.includes('imgur.com')) {
      console.error('Detected imgur URL, not using it:', image);
      // Folosim imaginea de fallback în loc
      const baseUrl = window.location.hostname === 'bossme.me' 
        ? 'https://bossme.me' 
        : (window.location.protocol === 'https:' 
          ? `${window.location.origin}` 
          : `https://${window.location.host}`);
          
      isFallbackImage = true;
      imageUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
      console.log('MetaTags - Folosim imaginea de fallback în loc de imgur:', imageUrl);
    }
    // Verificăm și convertim link-urile de la imgflip la URL-uri directe
    else if (image.includes('imgflip.com/i/')) {
      const match = image.match(/imgflip\.com\/i\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        imageUrl = `https://i.imgflip.com/${identifier}.jpg?t=${timestamp}&_nocache=1`;
        console.log('MetaTags - Am transformat URL-ul imgflip în URL direct:', imageUrl);
      } else {
        // Folosim fallback dacă nu putem converti URL-ul
        const baseUrl = window.location.hostname === 'bossme.me' 
          ? 'https://bossme.me' 
          : (window.location.protocol === 'https:' 
            ? `${window.location.origin}` 
            : `https://${window.location.host}`);
        
        isFallbackImage = true;
        imageUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
      }
    }
    else {
      // Adăugăm protocolul și domeniul dacă lipsesc
      if (!image.startsWith('http')) {
        // Folosim întotdeauna HTTPS pentru a preveni mixed content
        const baseUrl = window.location.hostname === 'bossme.me' 
          ? 'https://bossme.me' 
          : (window.location.protocol === 'https:' 
            ? `${window.location.origin}` 
            : `https://${window.location.host}`);
            
        const imagePath = image.startsWith('/') ? image : '/' + image;
        imageUrl = baseUrl + imagePath;
      } else if (image.startsWith('http://')) {
        // Convertim http la https pentru a preveni mixed content
        imageUrl = image.replace('http://', 'https://');
      } else {
        imageUrl = image;
      }
      
      // Verificăm dacă URL-ul conține parametrul de query pentru forțarea cache bust
      if (!imageUrl.includes('t=') && !imageUrl.includes('_t=')) {
        // Adăugăm timestamp la URL-ul imaginii pentru a forța reîmprospătarea și a preveni caching
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl = `${imageUrl}${separator}t=${timestamp}&_nocache=1`;
      }
      
      // Adăugăm parametri de dimensiune pentru Twitter Card
      if (!imageUrl.includes('tw_width=') && !imageUrl.includes('tw_height=')) {
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl = `${imageUrl}${separator}tw_width=1200&tw_height=630`;
      }
      
      // Adăugăm parametru pentru platforma de partajare
      if (sharingPlatform && !imageUrl.includes('_platform=')) {
        const separator = imageUrl.includes('?') ? '&' : '?';
        imageUrl = `${imageUrl}${separator}_platform=${sharingPlatform}`;
      }
      
      // Afișăm URL-ul complet al imaginii pentru debugging
      console.log('MetaTags - Folosesc imaginea reală:', imageUrl);
    }
  } else {
    // Folosim imaginea de fallback de dimensiune mare în loc de favicon
    // web-app-manifest-512x512.png are dimensiuni suficient de mari pentru preview-uri
    const baseUrl = window.location.hostname === 'bossme.me' 
      ? 'https://bossme.me' 
      : (window.location.protocol === 'https:' 
        ? `${window.location.origin}` 
        : `https://${window.location.host}`);
    
    imageUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
    
    // Adăugăm parametru pentru platformă
    if (sharingPlatform) {
      imageUrl += `&_platform=${sharingPlatform}`;
    }
    
    console.log('MetaTags - Nu am găsit imagine, folosesc imaginea fallback:', imageUrl);
    isFallbackImage = true;
  }

  // URL-ul canonic
  const canonicalUrl = url || window.location.href;

  // Descriere limitată pentru WhatsApp (max 80 caractere recomandat)
  const whatsappDescription = description && description.length > 80 
    ? description.substring(0, 77) + '...' 
    : description;

  // Log pentru debugging
  useEffect(() => {
    console.log('=== MetaTags Rendered ===');
    console.log('MetaTags - Timestamp:', timestamp);
    console.log('MetaTags - Image URL:', imageUrl);
    console.log('MetaTags - Canonical URL:', canonicalUrl);
    console.log('MetaTags - WhatsApp Description:', whatsappDescription);
    console.log('MetaTags - Using fallback image:', isFallbackImage);
    console.log('MetaTags - Detected sharing platform:', sharingPlatform);
    
    // Verificăm încă o dată validitatea URL-ului
    fetch(imageUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('🟢 Image URL verification SUCCESS:', imageUrl, response.status);
        } else {
          console.error('🔴 Image URL verification FAILED:', imageUrl, response.status);
        }
      })
      .catch(error => {
        console.error('🔴 Image URL verification ERROR:', error.message);
      });
  }, [imageUrl, canonicalUrl, timestamp, whatsappDescription, isFallbackImage, sharingPlatform]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook - Optimizat pentru preview-uri mari */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {/* Imagine Open Graph - forțăm imaginea să fie definită corect pentru preview */}
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:url" content={imageUrl} />
      
      {/* Dimensiuni pentru imagine - maximizate pentru toate platformele */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:alt" content={title} />
      
      {/* Facebook-specific meta */}
      <meta property="fb:app_id" content="1219609932336050" />
      
      {/* Meta tag-uri pentru Facebook Scraper - Forțează reincărcarea */}
      <meta property="og:rich_attachment" content="true" />
      <meta property="og:updated_time" content={new Date().toISOString()} />
      
      {/* Twitter Card - optimizare pentru card mare */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@bossme_me" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* WhatsApp Specific Tags */}
      <meta property="whatsapp:title" content={title} />
      <meta property="whatsapp:description" content={whatsappDescription} />
      <meta property="whatsapp:image" content={imageUrl} />
      
      {/* Specificații suplimentare pentru partajare */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="robots" content="max-image-preview:large" />
      
      {/* Specifice pentru articole */}
      {type === 'article' && (
        <>
          <meta property="article:published_time" content={new Date().toISOString()} />
          <meta property="article:modified_time" content={new Date().toISOString()} />
          <meta property="article:tag" content="meme,workplace,review" />
        </>
      )}
      
      {/* Additional Facebook Debugging Tags */}
      <meta property="og:app_id" content="1219609932336050" />
    </Helmet>
  );
};

export default MetaTags; 