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
  // Generăm un timestamp pentru a forța platforma socială să reincarce imaginile
  const timestamp = new Date().getTime();
  
  // Flag pentru a determina dacă folosim imagine de fallback sau o imagine reală de meme
  let isFallbackImage = false;
  
  // Asigură-te că avem un URL complet pentru imagine
  let imageUrl;
  if (image && image.trim() !== '') {
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
      imageUrl = `${imageUrl}${separator}t=${timestamp}`;
    }
    
    // Adăugăm parametri de dimensiune pentru Twitter Card
    if (!imageUrl.includes('tw_width=') && !imageUrl.includes('tw_height=')) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      imageUrl = `${imageUrl}${separator}tw_width=1200&tw_height=630`;
    }
    
    // Afișăm URL-ul complet al imaginii pentru debugging
    console.log('MetaTags - Folosesc imaginea reală:', imageUrl);
  } else {
    // Folosim imaginea de fallback de dimensiune mare în loc de favicon
    // web-app-manifest-512x512.png are dimensiuni suficient de mari pentru preview-uri
    const baseUrl = window.location.protocol === 'https:' ? 'https' : 'http';
    const hostname = window.location.hostname === 'bossme.me' ? 'bossme.me' : window.location.host;
    imageUrl = `${baseUrl}://${hostname}/images/web-app-manifest-512x512.png?t=${timestamp}`;
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
    console.log('MetaTags - Timestamp:', timestamp);
    console.log('MetaTags - Image URL:', imageUrl);
    console.log('MetaTags - Canonical URL:', canonicalUrl);
    console.log('MetaTags - WhatsApp Description:', whatsappDescription);
    console.log('MetaTags - Using fallback image:', isFallbackImage);
  }, [imageUrl, canonicalUrl, timestamp, whatsappDescription, isFallbackImage]);

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
      
      {/* Dimensiuni pentru imagine */}
      {isFallbackImage ? (
        // Dimensiuni pentru imaginea de fallback (512x512)
        <>
          <meta property="og:image:width" content="512" />
          <meta property="og:image:height" content="512" />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width:min" content="200" />
          <meta property="og:image:height:min" content="200" />
        </>
      ) : (
        // Dimensiuni pentru meme (imagini reale)
        <>
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:type" content="image/jpeg" />
          <meta property="og:image:width:min" content="200" />
          <meta property="og:image:height:min" content="200" />
        </>
      )}
      
      <meta property="og:image:alt" content={title} />
      
      {/* Facebook-specific meta */}
      <meta property="fb:app_id" content="936362457330483" />
      
      {/* Meta tag-uri pentru Facebook Scraper - Forțează reincărcarea */}
      <meta property="og:rich_attachment" content="true" />
      <meta property="og:updated_time" content={new Date().toISOString()} />
      
      {/* Twitter Card - optimizare pentru card mare */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@bossme_me" />
      <meta name="twitter:creator" content="@bossme_me" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:src" content={imageUrl} />
      <meta name="twitter:image:alt" content={title} />
      <meta name="twitter:domain" content="bossme.me" />
      
      {/* Dimensiuni pentru Twitter */}
      {isFallbackImage ? (
        // Dimensiuni pentru imaginea de fallback
        <>
          <meta name="twitter:image:width" content="512" />
          <meta name="twitter:image:height" content="512" />
        </>
      ) : (
        // Dimensiuni pentru meme (imagini reale)
        <>
          <meta name="twitter:image:width" content="1200" />
          <meta name="twitter:image:height" content="630" />
        </>
      )}
      
      {/* WhatsApp specific - Optimizate pentru link preview */}
      {isFallbackImage ? (
        <>
          <meta property="og:image:width" content="512" />
          <meta property="og:image:height" content="512" />
        </>
      ) : (
        <>
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
        </>
      )}
      
      {/* WhatsApp necesită aspect ratio de maxim 4:1 și minim 300px lățime */}
      <meta property="whatsapp:title" content={title} />
      <meta property="whatsapp:description" content={whatsappDescription} />
      <meta property="whatsapp:image" content={imageUrl} />
      <meta property="whatsapp:image:alt" content={title} />
      
      {/* WhatsApp dimension requirements for image */}
      {isFallbackImage ? (
        <>
          <meta property="whatsapp:image:width" content="512" />
          <meta property="whatsapp:image:height" content="512" />
        </>
      ) : (
        <>
          <meta property="whatsapp:image:width" content="1200" />
          <meta property="whatsapp:image:height" content="630" />
        </>
      )}
      
      {/* Specificări WhatsApp pentru browsere mobile */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="robots" content="max-image-preview:large" />
      
      {/* Specifice pentru articole */}
      {type === 'article' && (
        <>
          <meta property="article:published_time" content={new Date().toISOString()} />
          <meta property="article:modified_time" content={new Date().toISOString()} />
          <meta property="article:author" content="bossme.me" />
          <meta property="article:section" content="Workplace Memes" />
          <meta property="article:tag" content="workplace,reviews,meme" />
        </>
      )}
      
      {/* Meta tag suplimentar pentru a preveni caching în unele cazuri */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />
    </Helmet>
  );
};

export default MetaTags; 