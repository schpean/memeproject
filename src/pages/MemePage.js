import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CommentsPage from './CommentsPage';
import MetaTags from '../components/common/MetaTags';
import { memeApi } from '../api/api';
import { API_BASE_URL } from '../utils/config';

const MemePage = () => {
  const { id } = useParams();
  const [meme, setMeme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Preluarea datelor meme-ului pentru meta tags
  useEffect(() => {
    const fetchMemeData = async () => {
      setIsLoading(true);
      try {
        const memeData = await memeApi.getMemeById(id);
        setMeme(memeData);
        
        // Log pentru debugging
        console.log('Meme data loaded:', memeData);
        if (memeData) {
          console.log('Meme image URL:', memeData.imageUrl || memeData.image_url);
        }
      } catch (error) {
        console.error('Eroare la încărcarea datelor meme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemeData();
  }, [id]);
  
  // Construiește URL-ul complet pentru imagine
  const getFullImageUrl = () => {
    if (!meme) return null;
    
    const imageUrl = meme.imageUrl || meme.image_url;
    if (!imageUrl) return null;
    
    // Debug info la nivel de logare
    console.log('========== MEME IMAGE DEBUG ==========');
    console.log('Meme ID:', id);
    console.log('Procesez URL imagine original:', imageUrl);
    
    // Verificăm dacă imaginea vine de la un serviciu extern (imgflip, etc)
    if (imageUrl.includes('imgflip.com')) {
      // Convertim URL-ul imgflip la URL-ul direct către imagine
      const match = imageUrl.match(/imgflip\.com\/i\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        const directUrl = `https://i.imgflip.com/${identifier}.jpg`;
        console.log('Am transformat URL-ul imgflip în URL direct:', directUrl);
        return directUrl;
      }
    }
    
    // Nu acceptăm URL-uri de la imgur (acestea nu sunt permise în aplicația noastră)
    if (imageUrl.includes('imgur.com')) {
      console.error('Detected imgur URL, not using it:', imageUrl);
      console.log('⚠️ Imgur URL detectat - vom folosi imaginea de fallback');
      // Folosim imaginea fallback în loc
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : `https://${window.location.host}`;
      
      // Adăugăm timestamp pentru a preveni caching
      const timestamp = new Date().getTime();
      const fallbackUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}`;
      console.log('URL imagine fallback:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Construim URL-ul complet - folosim întotdeauna HTTPS pentru partajare
    let fullImageUrl;
    
    // Verificăm tipul de URL
    if (imageUrl.startsWith('http://')) {
      // Convertim http la https pentru a preveni mixed content
      fullImageUrl = imageUrl.replace('http://', 'https://');
      console.log('URL convertit de la HTTP la HTTPS:', fullImageUrl);
    }
    // URL-uri HTTPS le păstrăm ca atare
    else if (imageUrl.startsWith('https://')) {
      fullImageUrl = imageUrl;
      console.log('URL HTTPS păstrat ca atare:', fullImageUrl);
    }
    // Pentru URL-uri relative - construim URL-ul complet
    else {
      // Baza URL trebuie să fie întotdeauna HTTPS pentru Facebook și alte platforme
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : `https://${window.location.host}`;
      
      // Asigurăm formatul corect al path-ului
      const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      fullImageUrl = `${baseUrl}${imagePath}`;
      console.log('URL relativ convertit la absolut:', fullImageUrl);
    }
    
    // Verificăm dacă URL-ul este valid
    try {
      new URL(fullImageUrl);
    } catch (e) {
      console.error('URL invalid pentru imagine:', fullImageUrl);
      console.log('⚠️ URL invalid - vom folosi imaginea de fallback');
      
      // Folosim imaginea fallback în caz de eroare
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : `https://${window.location.host}`;
      
      // Adăugăm timestamp pentru a preveni caching
      const timestamp = new Date().getTime();
      return `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}`;
    }
    
    // Adăugăm parametrul de cache-busting pentru a forța reîncărcarea imaginii
    const timestamp = new Date().getTime();
    const separator = fullImageUrl.includes('?') ? '&' : '?';
    
    // Adăugăm și dimensiunile explicite pentru platformele sociale
    // Indicăm platforma pentru care este optimizată imaginea
    fullImageUrl = `${fullImageUrl}${separator}t=${timestamp}&tw_width=1200&tw_height=630&_platform=share`;
    
    console.log('URL final pentru imaginea meme-ului cu timestamp:', fullImageUrl);
    
    // Facem un HEAD request pentru a verifica dacă imaginea există
    fetch(fullImageUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('🟢 Imaginea există și este accesibilă:', response.status);
        } else {
          console.log('🔴 Imaginea nu este accesibilă:', response.status);
        }
      })
      .catch(error => {
        console.error('🔴 Eroare la verificarea imaginii:', error.message);
      });
    
    console.log('========== END MEME IMAGE DEBUG ==========');
    
    return fullImageUrl;
  };
  
  // Construiește titlul pentru meta tags
  const getMetaTitle = () => {
    if (!meme) return 'bossme.me - Workplace Memes';
    return meme.title || `${meme.company}'s review meme | bossme.me`;
  };
  
  // Construiește descrierea pentru meta tags
  const getMetaDescription = () => {
    if (!meme) return 'Expose the Fun. Share the Struggles. Meme Your Workplace!';
    
    let description = `Check out this meme about ${meme.company || 'workplace'}`;
    if (meme.message) {
      // Limitează descrierea la 160 de caractere
      const truncatedMessage = meme.message.length > 120 
        ? meme.message.substring(0, 120) + '...' 
        : meme.message;
      description += `: ${truncatedMessage}`;
    }
    
    return description;
  };
  
  // Generează URL-ul canonic absolut
  const getCanonicalUrl = () => {
    // URL-ul canonic trebuie să fie întotdeauna HTTPS pentru rețelele sociale
    const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
      ? 'https://bossme.me'
      : `https://${window.location.host}`;
    
    // Adăugăm parametru pentru a indica platforma de partajare
    return `${baseUrl}/meme/${id}?_source=share`;
  };
  
  // Afișăm URL-ul imaginii pentru debugging
  const imageUrl = getFullImageUrl();
  console.log('Final image URL for sharing:', imageUrl);
  
  // Force URL pentru debugging
  useEffect(() => {
    console.log('Current canonical URL:', getCanonicalUrl());
    console.log('Current image URL:', imageUrl);
  }, [imageUrl]);
  
  return (
    <>
      {/* Debugging info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ background: '#fafafa', padding: '5px', fontSize: '12px', color: '#666' }}>
          <strong>Debug Meta:</strong> {isLoading ? 'Loading...' : (imageUrl ? 'Image URL OK' : 'No image URL')}
        </div>
      )}
      
      {/* Meta Tags pentru Open Graph */}
      <MetaTags 
        title={getMetaTitle()}
        description={getMetaDescription()}
        image={imageUrl}
        url={getCanonicalUrl()}
        type="article"
      />
      
      {/* Încarcă pagina de comentarii cu ID-ul specificat */}
      <CommentsPage memeId={id} />
    </>
  );
};

export default MemePage;