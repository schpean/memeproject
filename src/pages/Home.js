import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import MemeCard from '../components/meme/MemeCard';

function Home() {
  const [topMemes, setTopMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopMemes = async () => {
      try {
        const q = query(
          collection(db, 'memes'),
          orderBy('votes', 'desc'),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const memes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTopMemes(memes);
      } catch (error) {
        console.error('Error fetching top memes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTopMemes();
  }, []);

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Manager Rant Memes</h1>
        <p>Create hilarious memes about management nightmares, vote for your favorites, and filter by company!</p>
      </div>
      
      <div className="top-memes-section">
        <h2>Top Rage-Inducing Memes</h2>
        {loading ? (
          <p>Loading top memes...</p>
        ) : (
          <div className="memes-grid">
            {topMemes.length > 0 ? (
              topMemes.map(meme => (
                <MemeCard key={meme.id} meme={meme} />
              ))
            ) : (
              <p>No memes yet. Be the first to post!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;