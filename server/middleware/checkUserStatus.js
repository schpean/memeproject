/**
 * Middleware pentru Verificarea Stării Utilizatorilor în bossme.me
 * 
 * Acest middleware verifică dacă:
 * - Utilizatorul există în baza de date
 * - Utilizatorul nu este marcat ca șters
 * 
 * Se folosește pentru toate rutele care necesită un utilizator activ
 * 
 * Sistemul este agnostic față de metoda de autentificare, folosind
 * exclusiv public_id (UUID) pentru a identifica utilizatorii.
 */

const pool = require('../db');
const userQueries = require('../models/user');

const checkUserStatus = async (req, res, next) => {
  const publicId = req.header('user-id') || req.body.userId || req.query.userId;
  
  if (!publicId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Trebuie să fiți autentificat pentru a efectua această acțiune.'
    });
  }
  
  // Verificăm dacă publicId are format de UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(publicId)) {
    return res.status(401).json({ 
      error: 'Invalid user ID format',
      message: 'Formatul identificatorului de utilizator este invalid.'
    });
  }
  
  try {
    // Căutăm utilizatorul după public_id
    const user = await userQueries.findByPublicId(publicId);
    
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
    
    // Adăugăm datele utilizatorului în request pentru a fi folosite mai târziu
    req.numericUserId = user.id; // ID-ul numeric din baza de date
    req.user = user;             // Obiectul complet al utilizatorului
    
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