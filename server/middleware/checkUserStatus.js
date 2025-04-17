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

const checkUserStatus = async (req, res, next) => {
  const userId = req.header('user-id') || req.body.userId || req.query.userId;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Trebuie să fiți autentificat pentru a efectua această acțiune.'
    });
  }
  
  try {
    const userCheck = await pool.query(
      'SELECT is_deleted FROM users WHERE google_id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Utilizatorul nu a fost găsit. Vă rugăm să vă autentificați din nou.'
      });
    }
    
    if (userCheck.rows[0].is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated',
        message: 'Acest cont a fost dezactivat și nu poate efectua acțiuni.'
      });
    }
    
    // Adăugăm ID-ul numeric al utilizatorului în request pentru a fi folosit mai târziu
    const numericIdResult = await pool.query('SELECT id FROM users WHERE google_id = $1', [userId]);
    req.numericUserId = numericIdResult.rows[0].id;
    
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