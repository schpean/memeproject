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
    
    // Detectăm platforma de partajare din URL (dacă există)
    const platform = detectPlatform();
    
    // Verificăm dacă imaginea vine de la un serviciu extern (imgflip, etc)
    if (imageUrl.includes('imgflip.com')) {
      // Convertim URL-ul imgflip la URL-ul direct către imagine
      const match = imageUrl.match(/imgflip\.com\/i\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        const identifier = match[1];
        const timestamp = new Date().getTime();
        let directUrl = `https://i.imgflip.com/${identifier}.jpg?t=${timestamp}&_nocache=1`;
        
        // Adăugăm parametru pentru platformă dacă există
        if (platform) {
          directUrl += `&_platform=${platform}`;
        }
        
        console.log('Am transformat URL-ul imgflip în URL direct:', directUrl);
        return directUrl;
      }
    }
    
    // Nu acceptăm URL-uri de la imgur (acestea nu sunt permise în aplicația noastră)
    if (imageUrl.includes('imgur.com') || imageUrl.includes('imgur')) {
      console.error('Detected imgur URL, not using it:', imageUrl);
      console.log('⚠️ Imgur URL detectat - vom folosi imaginea de fallback');
      // Folosim imaginea fallback - întotdeauna cu domeniul bossme.me fix
      const baseUrl = 'https://bossme.me';
      
      // Adăugăm timestamp pentru a preveni caching
      const timestamp = new Date().getTime();
      let fallbackUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
      
      // Adăugăm parametru pentru platformă dacă există
      if (platform) {
        fallbackUrl += `&_platform=${platform}`;
      }
      
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
      // Folosim întotdeauna https://bossme.me pentru toate URL-urile de imagini
      const baseUrl = 'https://bossme.me';
      
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
      
      // Folosim imaginea fallback - întotdeauna cu domeniul bossme.me fix
      const baseUrl = 'https://bossme.me';
      
      // Adăugăm timestamp pentru a preveni caching
      const timestamp = new Date().getTime();
      let fallbackUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
      
      // Adăugăm parametru pentru platformă dacă există
      if (platform) {
        fallbackUrl += `&_platform=${platform}`;
      }
      
      return fallbackUrl;
    }
    
    // Adăugăm parametrul de cache-busting pentru a forța reîncărcarea imaginii
    const timestamp = new Date().getTime();
    const separator = fullImageUrl.includes('?') ? '&' : '?';
    
    // Adăugăm dimensiunile standard pentru Facebook/Messenger (1200x630)
    fullImageUrl = `${fullImageUrl}${separator}t=${timestamp}&width=1200&height=630&_nocache=1`;
    
    // Adăugăm parametru pentru platformă dacă există
    if (platform) {
      fullImageUrl += `&_platform=${platform}`;
    }
    
    console.log('URL final pentru imaginea meme-ului cu timestamp:', fullImageUrl);
    
    // Facem un HEAD request pentru a verifica dacă imaginea există
    fetch(fullImageUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('🟢 Imaginea există și este accesibilă:', response.status);
        } else {
          console.log('🔴 Imaginea nu este accesibilă:', response.status);
          
          // Dacă imaginea nu este accesibilă, vom folosi fallback
          const baseUrl = 'https://bossme.me';
            
          const fallbackUrl = `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&_nocache=1`;
          console.log('Folosim URL fallback:', fallbackUrl);
          
          // Nu putem returna direct de aici din cauza naturii asincrone
          // Dar putem actualiza state-ul component pentru reimaginea
          if (typeof window !== 'undefined') {
            window.imgUrlFallback = fallbackUrl;
          }
        }
      })
      .catch(error => {
        console.error('🔴 Eroare la verificarea imaginii:', error.message);
      });
    
    console.log('========== END MEME IMAGE DEBUG ==========');
    
    // Verificăm dacă avem un fallback setat de verificarea asincronă de mai sus
    if (typeof window !== 'undefined' && window.imgUrlFallback) {
      const fallback = window.imgUrlFallback;
      window.imgUrlFallback = null; // resetăm pentru viitoarele apeluri
      return fallback;
    }
    
    return fullImageUrl;
  };
  
  // Construiește titlul pentru meta tags
  const getMetaTitle = () => {
    if (!meme) return 'bossme.me';
    return meme.title || 'bossme.me';
  };
  
  // Construiește descrierea pentru meta tags
  const getMetaDescription = () => {
    if (!meme) return 'bossme.me';
    return 'bossme.me';
  };
  
  // Generează URL-ul canonic absolut
  const getCanonicalUrl = () => {
    // URL-ul canonic este ÎNTOTDEAUNA https://bossme.me pentru a preveni redirecționări circulare
    return `https://bossme.me/meme/${id}`;
  };
  
  // Detectează și optimizează pentru platforma de partajare
  const detectPlatform = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('_platform') || '';
  };
  
  // Generează URL-uri optimizate pentru diverse platforme
  const getPlatformShareUrl = (platform) => {
    // Folosim strict https://bossme.me pentru toate URL-urile partajate
    return `https://bossme.me/meme/${id}${platform ? `?_platform=${platform}` : ''}`;
  };
  
  // Funcții helper pentru fiecare platformă
  const getMessengerUrl = () => getPlatformShareUrl('messenger');
  const getWhatsAppUrl = () => getPlatformShareUrl('whatsapp');
  const getTwitterUrl = () => getPlatformShareUrl('twitter');
  
  // Generează URL Messenger cu forcing direct pe imagine
  const getMessengerImageDirectUrl = () => {
    if (!meme) return null;
    
    // Construim URL-ul de tip messenger-share
    const baseUrl = 'https://www.facebook.com/dialog/send';
    
    // Folosim app_id corect
    const queryParams = new URLSearchParams({
      app_id: '1219609932336050',
      link: getPlatformShareUrl('messenger'),
      redirect_uri: 'https://bossme.me'
    });
    
    return `${baseUrl}?${queryParams.toString()}`;
  };
  
  // Afișăm URL-ul imaginii pentru debugging
  const imageUrl = getFullImageUrl();
  const platform = detectPlatform();
  
  console.log('Final image URL for sharing:', imageUrl);
  console.log('Detected platform:', platform);
  
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