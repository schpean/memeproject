import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Componentă optimizată pentru managementul meta tag-urilor și Open Graph
 * Facilitează partajarea optimă a conținutului pe rețelele sociale cu preview-uri mari
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
  
  // Asigură-te că avem un URL complet pentru imagine
  let imageUrl = image && !image.startsWith('http') 
    ? `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}` 
    : image;
    
  // Adăugăm timestamp la URL-ul imaginii pentru a forța reîmprospătarea
  if (imageUrl) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    imageUrl = `${imageUrl}${separator}t=${timestamp}`;
  }

  // URL-ul canonic
  const canonicalUrl = url || window.location.href;

  // Log pentru debugging
  useEffect(() => {
    console.log('MetaTags - Timestamp:', timestamp);
    console.log('MetaTags - Image URL:', imageUrl);
    console.log('MetaTags - Canonical URL:', canonicalUrl);
  }, [imageUrl, canonicalUrl, timestamp]);

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
      
      {/* Imagine Open Graph - forțăm imaginea să fie definită corect */}
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {imageUrl && <meta property="og:image:secure_url" content={imageUrl} />}
      {imageUrl && <meta property="og:image:width" content="1200" />}
      {imageUrl && <meta property="og:image:height" content="630" />}
      {imageUrl && <meta property="og:image:alt" content={title} />}
      {imageUrl && <meta property="og:image:type" content="image/jpeg" />}
      
      {/* Facebook-specific meta */}
      <meta property="fb:app_id" content="936362457330483" />
      
      {/* Meta tag-uri pentru Facebook Scraper */}
      <meta property="og:rich_attachment" content="true" />
      <meta property="og:updated_time" content={new Date().toISOString()} />
      
      {/* Twitter Card - optimizare pentru card mare */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@bossme_me" />
      <meta name="twitter:creator" content="@bossme_me" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {imageUrl && <meta name="twitter:image:alt" content={title} />}
      {/* Forțăm Twitter să folosească un card mare */}
      <meta name="twitter:image:width" content="1200" />
      <meta name="twitter:image:height" content="630" />
      
      {/* WhatsApp specific */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
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
      <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta http-equiv="Pragma" content="no-cache" />
      <meta http-equiv="Expires" content="0" />
    </Helmet>
  );
};

export default MetaTags; 