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
 * - google_id (pentru autentificare Google)
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

const userQueries = {
  // Găsește un utilizator după google_id
  findByGoogleId: async (googleId) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.google_id = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [googleId]);
    return result.rows[0];
  },

  // Găsește un utilizator după email
  findByEmail: async (email) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.email = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [email]);
    return result.rows[0];
  },

  // Creează un utilizator nou
  create: async (userData) => {
    const { google_id, email, username, role_id = 1 } = userData;
    const result = await pool.query(`
      INSERT INTO users (google_id, email, username, role_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [google_id, email, username, role_id]);
    return result.rows[0];
  },

  // Actualizează un utilizator
  update: async (googleId, updateData) => {
    const { email, username, role_id } = updateData;
    const result = await pool.query(`
      UPDATE users
      SET email = COALESCE($2, email),
          username = COALESCE($3, username),
          role_id = COALESCE($4, role_id),
          updated_at = NOW()
      WHERE google_id = $1
      RETURNING *
    `, [googleId, email, username, role_id]);
    return result.rows[0];
  },

  // Șterge logic un utilizator
  softDelete: async (googleId) => {
    const result = await pool.query(`
      UPDATE users
      SET is_deleted = TRUE,
          updated_at = NOW()
      WHERE google_id = $1
      RETURNING *
    `, [googleId]);
    return result.rows[0];
  },

  // Găsește un utilizator după username
  findByUsername: async (username) => {
    const result = await pool.query(`
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN user_roles r ON u.role_id = r.id
      WHERE u.username = $1 AND (u.is_deleted IS NULL OR u.is_deleted = FALSE)
    `, [username]);
    return result.rows[0];
  }
};

module.exports = userQueries; 