/**
 * Middleware de Autorizare pentru bossme.me
 * 
 * Acest fișier conține middleware-ul de autorizare care:
 * - Verifică dacă utilizatorul este autentificat pentru rutele protejate
 * - Gestionează rolurile utilizatorilor (admin, moderator, user)
 * - Verifică dacă contul utilizatorului este activ și nu șters
 * 
 * Sistemul este agnostic față de metoda de autentificare, folosind
 * exclusiv public_id (UUID) pentru a identifica utilizatorii.
 * 
 * Dependențe:
 * - ../models/user.js pentru interogări legate de utilizatori
 * 
 * Folosit de:
 * - Toate rutele care necesită autentificare
 * - Toate rutele care necesită verificarea rolurilor
 */

const pool = require('../db');
const userQueries = require('../models/user');

// Role-based authorization middleware
const authorize = (roles = []) => {
  // roles parameter can be a single role string (e.g., 'admin') 
  // or an array of roles (e.g., ['admin', 'moderator'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    // Get public_id (UUID) from the request
    const publicId = req.headers['user-id'] || req.query.userId || (req.body && req.body.userId);
    
    if (!publicId) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    // Verificăm dacă publicId are format de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(publicId)) {
      return res.status(401).json({ 
        error: 'Unauthorized - Invalid user ID format',
        redirectToLogin: true 
      });
    }

    try {
      // Căutăm utilizatorul după public_id
      const user = await userQueries.findByPublicId(publicId);
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized - User not found or account has been deleted',
          redirectToLogin: true 
        });
      }
      
      // Check if role is required and if user's role is allowed
      if (roles.length && !roles.includes(user.role_name)) {
        return res.status(403).json({ 
          error: 'Forbidden - Insufficient permissions',
          requiredRoles: roles,
          userRole: user.role_name
        });
      }
      
      // Add user to request for use in route handlers
      req.user = user;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

module.exports = {
  authorize
}; 