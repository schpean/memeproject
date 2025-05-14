import React from 'react';
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
  // Asigură-te că avem un URL complet pentru imagine
  const imageUrl = image && !image.startsWith('http') 
    ? `${window.location.origin}${image.startsWith('/') ? '' : '/'}${image}` 
    : image;

  // URL-ul canonic
  const canonicalUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook - Optimizat pentru preview-uri mai mari */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      {imageUrl && <meta property="og:image:secure_url" content={imageUrl} />}
      {imageUrl && <meta property="og:image:width" content="1200" />}
      {imageUrl && <meta property="og:image:height" content="630" />}
      {imageUrl && <meta property="og:image:type" content="image/jpeg" />}
      {imageUrl && <meta property="og:image:alt" content={title} />}
      
      {/* Facebook Messenger specific */}
      <meta property="fb:app_id" content="936362457330483" />
      
      {/* Twitter Card - Optimizat pentru preview-uri mari */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@bossme_me" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {imageUrl && <meta name="twitter:image:alt" content={title} />}
      
      {/* WhatsApp specific */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Dimensiune și tip - forțează preview mare */}
      {type === 'article' && (
        <>
          <meta property="article:published_time" content={new Date().toISOString()} />
          <meta property="article:author" content="bossme.me" />
          <meta property="article:section" content="Workplace Memes" />
          <meta property="article:tag" content="workplace,reviews,meme" />
        </>
      )}
    </Helmet>
  );
};

export default MetaTags; 