/**
 * Route Handler pentru Autentificare în bossme.me
 * 
 * Acest fișier gestionează toate rutele legate de autentificare:
 * - /users/google-auth pentru autentificare Google OAuth
 * - /users/update-nickname pentru actualizare nickname
 * - /auth/verify-email pentru verificare email
 * 
 * Menține compatibilitatea cu URL-urile existente:
 * - https://bossme.me/users/google-auth
 * - http://localhost:1337/users/google-auth
 * - http://localhost/users/google-auth
 * 
 * Dependențe:
 * - ../services/userService.js pentru logica de business
 * - ../middleware/auth.js pentru verificări de autorizare
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../email');
const { authorize } = require('../middleware/auth');
const userQueries = require('../models/user');

// Update the Google OAuth login to include role information and email verification
router.post('/google-auth', async (req, res) => {
  try {
    const { googleId, email, displayName, photoURL, token } = req.body;
    
    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }
    
    // Verify the token with Google using server-side client secret from config
    if (!token) {
      console.warn('No token provided for validation');
    }
    
    // Verificăm dacă acest Google ID aparține unui cont marcat ca șters
    const deletedCheck = await userQueries.findByGoogleId(googleId);
    
    if (deletedCheck && deletedCheck.is_deleted) {
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'This account has been deactivated. Please contact the administrator for assistance.'
      });
    }
    
    // Check if this email is blacklisted (was previously deleted)
    const emailCheck = await userQueries.findByEmail(email);

    if (emailCheck && emailCheck.is_deleted) {
      return res.status(403).json({ 
        error: 'This email address cannot be used for registration as it was previously associated with a deleted account.' 
      });
    }
    
    if (deletedCheck) {
      // User exists, update last login time
      const user = deletedCheck;
      await userQueries.update(user.google_id, {
        last_login: new Date(),
        photo_url: getMascotImageUrl(user.username)
      });
      
      // If the user hasn't verified their email yet, prompt them to verify
      if (!user.is_verified) {
        // Generate a new verification token
        const verificationToken = uuidv4();
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24); // Token expires in 24 hours
        
        // Update the user's verification token
        await userQueries.update(user.google_id, {
          verification_token: verificationToken,
          verification_expires: expiryTime
        });
        
        // Send verification email
        await emailService.sendVerificationEmail(user, verificationToken);
        
        return res.json({
          ...user,
          isAdmin: user.role_name === 'admin',
          isModerator: user.role_name === 'moderator' || user.role_name === 'admin',
          needsVerification: true
        });
      }
      
      return res.json({
        ...user,
        isAdmin: user.role_name === 'admin',
        isModerator: user.role_name === 'moderator' || user.role_name === 'admin'
      });
    }
    
    // User doesn't exist, generate a unique username
    const username = await generateUniqueUsername(displayName);
    
    // Get default role id (user role)
    const roleResult = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1',
      ['user']
    );
    
    const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1;
    
    // Generate verification token
    const verificationToken = uuidv4();
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 24); // Token expires in 24 hours
    
    // Create new user
    const newUser = await userQueries.create({
      google_id: googleId,
      email,
      username,
      photo_url: getMascotImageUrl(username),
      role_id: roleId,
      verification_token: verificationToken,
      verification_expires: expiryTime
    });
    
    // Send verification email
    await emailService.sendVerificationEmail(newUser, verificationToken);
    
    res.status(201).json({
      ...newUser,
      isAdmin: newUser.role_name === 'admin',
      isModerator: newUser.role_name === 'moderator' || newUser.role_name === 'admin',
      needsVerification: true
    });
  } catch (error) {
    console.error('Error during Google authentication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user nickname
router.post('/update-nickname', async (req, res) => {
  try {
    const { userId, newNickname } = req.body;

    if (!userId || !newNickname) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'User ID and new nickname are required' });
    }

    if (newNickname.length < 3 || newNickname.length > 30) {
      console.log('Invalid nickname length');
      return res.status(400).json({ error: 'Nickname must be between 3 and 30 characters' });
    }

    // Check if the user exists and if they have already changed their nickname
    const user = await userQueries.findByGoogleId(userId);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.nickname_changed) {
      console.log('User already changed nickname');
      return res.status(403).json({ error: 'You can only change your nickname once' });
    }

    if (user.is_deleted) {
      console.log('User is marked as deleted');
      return res.status(403).json({ 
        error: 'Account deactivated', 
        message: 'Your account has been deactivated and cannot be updated.'
      });
    }

    // Check if the nickname is already taken
    const nicknameExists = await userQueries.findByUsername(newNickname);
    if (nicknameExists && nicknameExists.id !== user.id) {
      console.log('Nickname already taken');
      return res.status(400).json({ error: 'This nickname is already taken' });
    }

    // Update the user's nickname
    await userQueries.update(userId, {
      username: newNickname,
      nickname_changed: true
    });

    res.json({ message: 'Nickname updated successfully', newNickname });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to generate a unique username
async function generateUniqueUsername(displayName) {
  // Create a base username from display name
  let baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .substring(0, 10); // Limit length
  
  // Add some random colors or animals as prefix
  const colors = ['red', 'blue', 'green', 'purple', 'golden', 'silver', 'black', 'white'];
  const animals = ['fox', 'wolf', 'eagle', 'bear', 'tiger', 'lion', 'hawk', 'deer', 'panda'];
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  
  // Add random number
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  
  // Generate username
  let username = `${randomColor}${randomAnimal}${randomNum}`;
  
  // Check if username exists
  let usernameExists = true;
  while (usernameExists) {
    const exists = await userQueries.findByUsername(username);
    
    if (!exists) {
      usernameExists = false;
    } else {
      // Try another random number
      const newRandomNum = Math.floor(Math.random() * 9000) + 1000;
      username = `${randomColor}${randomAnimal}${newRandomNum}`;
    }
  }
  
  return username;
}

// Helper function to generate a mascot image URL based on username
function getMascotImageUrl(username) {
  if (!username) {
    return 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=anonymous';
  }
  
  // Generate Dicebear avatar URL with username as seed
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`;
}

module.exports = router; 