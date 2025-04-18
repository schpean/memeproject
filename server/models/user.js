/**
 * Model și Queries pentru Utilizatori în bossme.me
 * 
 * Acest fișier gestionează toate interacțiunile cu baza de date pentru utilizatori
 * folosind un sistem agnostic de autentificare bazat pe UUID.
 * 
 * Schema tabelului users:
 * - public_id (UUID unic generat intern pentru utilizator)
 * - auth_provider_id (legătura cu provider-ul de autentificare)
 * - auth_provider_user_id (ID-ul utilizatorului în sistemul provider-ului)
 * - email
 * - username
 * - role_id (legătura cu tabela roles)
 * - is_deleted
 * - created_at
 * - updated_at
 * 
 * Dependențe:
 * - ../db.js pentru conexiunea la baza de date
 * 
 * Folosit de:
 * - services/userService.js pentru operații cu utilizatori
 * - middleware/auth.js pentru verificări
 */

const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// Constants for providers
const PROVIDERS = {
  GOOGLE: 'google',
  APPLE: 'apple',
  EMAIL: 'email'
};

const userQueries = {
  // Funcție generică pentru a obține ID-ul provider-ului după nume
  getProviderId: async (providerName) => {
    const result = await pool.query(
      'SELECT id FROM auth_providers WHERE name = $1',
      [providerName]
    );
    return result.rows[0]?.id;
  },

  // Metodă principală pentru a găsi un utilizator - după public_id
  findByPublicId: async (publicId) => {
    if (!publicId) return null;
    
    const result = await pool.query(`
      SELECT u.*, r.name as role_name, ap.name as auth_provider
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
      WHERE u.public_id = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [publicId]);
    return result.rows[0];
  },
  
  // Obține ID-ul intern din baza de date pentru un public_id
  getInternalIdByPublicId: async (publicId) => {
    if (!publicId) return null;
    
    const result = await pool.query('SELECT id FROM users WHERE public_id = $1', [publicId]);
    return result.rows[0]?.id;
  },

  // Pentru autentificare: găsește utilizator după provider și ID extern
  findByProviderId: async (providerName, providerUserId) => {
    const providerId = await userQueries.getProviderId(providerName);
    if (!providerId) return null;

    const result = await pool.query(`
      SELECT u.*, r.name as role_name, u.public_id 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.auth_provider_id = $1 AND u.auth_provider_user_id = $2 
        AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [providerId, providerUserId]);
    return result.rows[0];
  },

  // Găsește un utilizator după email
  findByEmail: async (email) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name, ap.name as auth_provider
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
      WHERE u.email = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [email]);
    return result.rows[0];
  },

  // Creează un utilizator nou
  create: async (userData) => {
    const { auth_provider, auth_provider_user_id, email, username, role_id = 1, verification_token, verification_expires, photo_url } = userData;
    
    // Obține ID-ul provider-ului
    const providerId = await userQueries.getProviderId(auth_provider || PROVIDERS.GOOGLE);
    if (!providerId) {
      throw new Error(`Provider de autentificare necunoscut: ${auth_provider}`);
    }

    // Generează un UUID unic pentru utilizator
    const publicId = uuidv4();

    const result = await pool.query(`
      INSERT INTO users (
        public_id, auth_provider_id, auth_provider_user_id, email, username, 
        role_id, verification_token, verification_expires, photo_url,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [publicId, providerId, auth_provider_user_id, email, username, role_id, verification_token, verification_expires, photo_url]);
    
    return result.rows[0];
  },

  // Metodă principală pentru actualizare - folosește exclusiv public_id
  update: async (publicId, updateData) => {
    if (!publicId) {
      throw new Error('Public ID este obligatoriu pentru actualizare');
    }

    // Construim SET clause dinamic pentru valorile primite
    const updates = [];
    const values = [publicId]; // $1
    let paramIndex = 2;
    
    // Adaugă fiecare câmp valid la updates
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    // Adaugă updated_at întotdeauna
    updates.push('updated_at = NOW()');
    
    // Construiește query-ul complet
    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE public_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Alias pentru update - pentru a menține compatibilitatea cu codul existent
  updateByPublicId: async (publicId, updateData) => {
    return userQueries.update(publicId, updateData);
  },

  // Metodă principală pentru ștergere - folosește exclusiv public_id
  softDelete: async (publicId) => {
    if (!publicId) {
      throw new Error('Public ID este obligatoriu pentru ștergere');
    }
    
    const result = await pool.query(`
      UPDATE users
      SET is_deleted = TRUE,
          updated_at = NOW()
      WHERE public_id = $1
      RETURNING *
    `, [publicId]);
    return result.rows[0];
  },

  // Găsește un utilizator după username
  findByUsername: async (username) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name, ap.name as auth_provider
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
      WHERE u.username = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [username]);
    return result.rows[0];
  },
  
  // Găsește un utilizator după ID intern
  findById: async (id) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name, ap.name as auth_provider
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      LEFT JOIN auth_providers ap ON u.auth_provider_id = ap.id
      WHERE u.id = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [id]);
    return result.rows[0];
  },
  
  // Verifică dacă un utilizator are rol de admin sau moderator
  hasRole: async (publicId, roles = ['admin', 'moderator']) => {
    if (!publicId) return false;
    
    const placeholder = roles.map((_, idx) => `$${idx + 2}`).join(',');
    const result = await pool.query(`
      SELECT u.id
      FROM users u
      JOIN user_roles r ON u.role_id = r.id
      WHERE u.public_id = $1 
        AND r.name IN (${placeholder})
        AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [publicId, ...roles]);
    
    return result.rows.length > 0;
  }
};

// Exportăm și constantele pentru a putea fi folosite în alte locuri
module.exports = {
  ...userQueries,
  PROVIDERS
}; 