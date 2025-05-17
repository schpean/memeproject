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
    
    // Obține URL-ul imaginii din meme
    const imageUrl = meme.imageUrl || meme.image_url;
    if (!imageUrl) return null;
    
    console.log('Procesez URL imagine original:', imageUrl);
    
    // Dacă URL-ul conține imgur, trebuie să folosim imaginea noastră de fallback
    // NOTĂ: Permitem imagini de pe imgflip.com, doar imgur.com este blocat
    if (imageUrl.includes('imgur.com')) {
      console.log('Imagine externă imgur detectată, folosim imaginea de fallback');
      
      // Folosim imaginea de fallback din directorul public
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : (window.location.protocol === 'https:' 
          ? `${window.location.origin}` 
          : `https://${window.location.host}`);
          
      const timestamp = new Date().getTime();
      return `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&source=meme_${id}`;
    }
    
    // Verificăm dacă este un URL relativ sau absolut
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.log('Imagine cu URL relativ, adăugăm domeniul...');
    }
    
    // Construim URL-ul complet - folosim întotdeauna HTTPS pentru partajare
    let fullImageUrl;
    
    // Verificăm tipul de URL
    if (imageUrl.startsWith('http://')) {
      // Convertim http la https pentru a preveni mixed content
      fullImageUrl = imageUrl.replace('http://', 'https://');
    }
    // URL-uri HTTPS le păstrăm ca atare
    else if (imageUrl.startsWith('https://')) {
      fullImageUrl = imageUrl;
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
    }
    
    // Verificăm dacă URL-ul este valid
    try {
      new URL(fullImageUrl);
    } catch (e) {
      console.error('URL invalid pentru imagine:', fullImageUrl);
      
      // Folosim imaginea de fallback în caz de URL invalid
      const baseUrl = window.location.hostname === 'bossme.me' || process.env.NODE_ENV === 'production'
        ? 'https://bossme.me'
        : (window.location.protocol === 'https:' 
          ? `${window.location.origin}` 
          : `https://${window.location.host}`);
          
      const timestamp = new Date().getTime();
      return `${baseUrl}/images/web-app-manifest-512x512.png?t=${timestamp}&source=meme_${id}_error`;
    }
    
    // Verificăm dacă URL-ul conține parametrul de timestamp pentru a forța reîncărcarea
    if (!fullImageUrl.includes('t=') && !fullImageUrl.includes('_t=')) {
      const timestamp = new Date().getTime();
      const separator = fullImageUrl.includes('?') ? '&' : '?';
      
      // Adăugăm și dimensiunile minime pentru Twitter Card (summary_large_image) care necesită minim 300x157
      // Indicăm explicit că imaginea are dimensiunile corecte pentru Twitter
      fullImageUrl = `${fullImageUrl}${separator}t=${timestamp}&tw_width=1200&tw_height=630&source=meme_${id}`;
    }
    
    console.log('URL final pentru imaginea meme-ului cu timestamp:', fullImageUrl);
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
    
    // Adăugăm parametru pentru a forța reîmprospătarea cache-ului pentru platformele sociale
    const canonical = `${baseUrl}/meme/${id}`;
    const timestamp = new Date().getTime();
    return `${canonical}?_t=${timestamp}`;
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
          <br />
          <small>{imageUrl}</small>
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