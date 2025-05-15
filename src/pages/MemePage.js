import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CommentsPage from './CommentsPage';
import MetaTags from '../components/common/MetaTags';
import { memeApi } from '../api/api';
import { API_BASE_URL } from '../utils/config';

const MemePage = () => {
  const { id } = useParams();
  const [meme, setMeme] = useState(null);
  
  // Preluarea datelor meme-ului pentru meta tags
  useEffect(() => {
    const fetchMemeData = async () => {
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
      }
    };

    fetchMemeData();
  }, [id]);
  
  // Construiește URL-ul complet pentru imagine
  const getFullImageUrl = () => {
    if (!meme) return null;
    
    const imageUrl = meme.imageUrl || meme.image_url;
    if (!imageUrl) return null;
    
    console.log('Procesez URL imagine original:', imageUrl);
    
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
    
    // Adăugăm un timestamp pentru a preveni caching-ul și a forța reîncărcarea
    // Verificăm întâi dacă URL-ul nu conține deja un parametru de timestamp
    if (!fullImageUrl.includes('t=') && !fullImageUrl.includes('_t=')) {
      const timestamp = new Date().getTime();
      const separator = fullImageUrl.includes('?') ? '&' : '?';
      fullImageUrl = `${fullImageUrl}${separator}t=${timestamp}`;
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
    return `${baseUrl}/meme/${id}`;
  };
  
  // Afișăm URL-ul imaginii pentru debugging
  const imageUrl = getFullImageUrl();
  console.log('Final image URL for sharing:', imageUrl);
  
  return (
    <>
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