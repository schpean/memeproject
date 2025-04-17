/**
 * Model și Queries pentru Utilizatori în bossme.me
 * 
 * Acest fișier gestionează toate interacțiunile cu baza de date pentru utilizatori:
 * - Queries pentru autentificare și înregistrare
 * - Queries pentru actualizarea profilului
 * - Queries pentru gestionarea rolurilor
 * - Queries pentru verificarea email-urilor
 * - Queries pentru gestionarea sesiunilor
 * 
 * Schema tabelului users:
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

  // Găsește un utilizator după auth_provider și id extern
  findByProviderId: async (providerName, providerUserId) => {
    const providerId = await userQueries.getProviderId(providerName);
    if (!providerId) return null;

    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.auth_provider_id = $1 AND u.auth_provider_user_id = $2 
        AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [providerId, providerUserId]);
    return result.rows[0];
  },

  // NOTĂ: Pentru a menține sistemul agnostic, evităm a folosi funcții specifice provider-ilor
  // În locul findByGoogleId(), folosește findByProviderId(PROVIDERS.GOOGLE, id)

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

    const result = await pool.query(`
      INSERT INTO users (
        auth_provider_id, auth_provider_user_id, email, username, 
        role_id, verification_token, verification_expires, photo_url,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [providerId, auth_provider_user_id, email, username, role_id, verification_token, verification_expires, photo_url]);
    
    return result.rows[0];
  },

  // Actualizează un utilizator
  update: async (auth_provider, providerUserId, updateData) => {
    // Pentru compatibilitate cu codul existent care folosește google_id direct
    let providerId;
    
    if (typeof auth_provider === 'string' && auth_provider.includes('google')) {
      // Cazul în care primul argument este direct googleId
      providerId = await userQueries.getProviderId(PROVIDERS.GOOGLE);
      providerUserId = auth_provider; // Primul argument este de fapt providerUserId
    } else {
      // Cazul normal
      providerId = await userQueries.getProviderId(auth_provider);
    }
    
    if (!providerId) {
      throw new Error(`Provider necunoscut: ${auth_provider}`);
    }

    // Construim SET clause dinamic pentru valorile primite
    const updates = [];
    const values = [providerId, providerUserId]; // $1, $2
    let paramIndex = 3;
    
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
      WHERE auth_provider_id = $1 AND auth_provider_user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Șterge logic un utilizator
  softDelete: async (auth_provider, providerUserId) => {
    // Pentru compatibilitate cu codul existent care folosește google_id direct
    let providerId;
    
    if (typeof auth_provider === 'string' && !providerUserId) {
      // Cazul în care primul argument este direct googleId
      providerId = await userQueries.getProviderId(PROVIDERS.GOOGLE);
      providerUserId = auth_provider; // Primul argument este de fapt providerUserId
    } else {
      // Cazul normal
      providerId = await userQueries.getProviderId(auth_provider);
    }

    const result = await pool.query(`
      UPDATE users
      SET is_deleted = TRUE,
          updated_at = NOW()
      WHERE auth_provider_id = $1 AND auth_provider_user_id = $2
      RETURNING *
    `, [providerId, providerUserId]);
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
  
  // Pentru compatibilitate temporară cu codul existent - a se elimina după migrare completă
  findByGoogleId: async (googleId) => {
    console.warn('DEPRECATED: findByGoogleId este depreciat. Folosiți findByProviderId(PROVIDERS.GOOGLE, id)');
    return userQueries.findByProviderId(PROVIDERS.GOOGLE, googleId);
  }
};

// Exportăm și constantele pentru a putea fi folosite în alte locuri
module.exports = {
  ...userQueries,
  PROVIDERS
}; 