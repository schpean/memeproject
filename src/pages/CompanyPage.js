import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import MemeCard from '../components/meme/MemeCard';

function CompanyPage() {
  const { companyName } = useParams();
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyMemes = async () => {
      try {
        const q = query(
          collection(db, 'memes'),
          where('company', '==', companyName)
        );
        
        const snapshot = await getDocs(q);
        const companyMemes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMemes(companyMemes);
      } catch (error) {
        console.error('Error fetching company memes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyMemes();
  }, [companyName]);

  return (
    <div className="company-page">
      <h1>Memes about {companyName}</h1>
      
      {loading ? (
        <p>Loading memes...</p>
      ) : (
        <div className="memes-grid">
          {memes.length > 0 ? (
            memes.map(meme => (
              <MemeCard key={meme.id} meme={meme} />
            ))
          ) : (
            <p>No memes found for {companyName}. Be the first to create one!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanyPage;