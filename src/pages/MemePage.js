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
    
    // Handle server-relative URLs (those starting with /uploads/)
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const apiBaseUrl = process.env.NODE_ENV === 'production'
        ? (process.env.REACT_APP_API_BASE_URL || 'https://bossme.me')
        : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:1337');
      return `${apiBaseUrl}${imageUrl}`;
    }
    
    // Handle absolute URLs - ensure they're preserved as-is
    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      return imageUrl;
    }
    
    return null;
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
  
  return (
    <>
      {/* Meta Tags pentru Open Graph */}
      <MetaTags 
        title={getMetaTitle()}
        description={getMetaDescription()}
        image={getFullImageUrl()}
        type="article"
      />
      
      {/* Încarcă pagina de comentarii cu ID-ul specificat */}
      <CommentsPage memeId={id} />
    </>
  );
};

export default MemePage;