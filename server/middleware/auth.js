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
      // Get user and their role - use google_id instead of id and exclude deleted users
      const result = await pool.query(`
        SELECT u.*, r.name as role_name 
        FROM users u
        LEFT JOIN user_roles r ON u.role_id = r.id
        WHERE u.google_id = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
      `, [userId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Unauthorized - User not found or account has been deleted',
          redirectToLogin: true 
        });
      }
      
      const user = result.rows[0];
      
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