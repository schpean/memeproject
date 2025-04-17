/**
 * Middleware de Autorizare pentru bossme.me
 * 
 * Acest fișier conține middleware-ul de autorizare care:
 * - Verifică dacă utilizatorul este autentificat pentru rutele protejate
 * - Gestionează rolurile utilizatorilor (admin, moderator, user)
 * - Verifică tokenurile JWT pentru sesiuni
 * - Gestionează accesul la resurse bazat pe roluri
 * - Verifică dacă contul utilizatorului este activ și nu șters
 * 
 * Dependențe:
 * - ../models/user.js pentru interogări legate de utilizatori
 * - ../config pentru configurări JWT
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
    // Get user ID from the request
    const userId = req.headers['user-id'] || req.query.userId || (req.body && req.body.userId);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    try {
      // Determină provider-ul din header sau query - default la Google pentru compatibilitate
      const authProvider = req.headers['auth-provider'] || 
                          req.query.authProvider || 
                          (req.body && req.body.authProvider) || 
                          userQueries.PROVIDERS.GOOGLE;
                          
      // Găsește utilizatorul folosind provider-ul și ID-ul
      const user = await userQueries.findByProviderId(authProvider, userId);
      
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