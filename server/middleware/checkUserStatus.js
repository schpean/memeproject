/**
 * Middleware pentru Verificarea Stării Utilizatorilor în bossme.me
 * 
 * Acest middleware verifică dacă:
 * - Utilizatorul există în baza de date
 * - Utilizatorul nu este marcat ca șters
 * 
 * Se folosește pentru toate rutele care necesită un utilizator activ
 */

const pool = require('../db');
const userQueries = require('../models/user');

const checkUserStatus = async (req, res, next) => {
  const userId = req.header('user-id') || req.body.userId || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Trebuie să fiți autentificat pentru a efectua această acțiune.'
    });
  }
  
  try {
    // Determină provider-ul din header, body sau query - default la Google pentru compatibilitate
    const authProvider = req.header('auth-provider') || 
                         req.body.authProvider || 
                         req.query.authProvider || 
                         userQueries.PROVIDERS.GOOGLE;
    
    // Verifică utilizatorul folosind provider-ul și ID-ul
    const user = await userQueries.findByProviderId(authProvider, userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Utilizatorul nu a fost găsit. Vă rugăm să vă autentificați din nou.'
      });
    }
    
    if (user.is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        message: 'Acest cont a fost dezactivat și nu poate efectua acțiuni.'
      });
    }
    
    // Adăugăm ID-ul numeric al utilizatorului în request pentru a fi folosit mai târziu
    req.numericUserId = user.id;
    
    next();
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'A apărut o eroare la verificarea stării contului. Vă rugăm să încercați din nou.'
    });
  }
};

module.exports = checkUserStatus; 