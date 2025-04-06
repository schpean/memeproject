const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter using SMTP settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify the connection to the email provider
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Error connecting to email service:', error);
    return false;
  }
};

// Send verification email to the user
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_BASE_URL}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'MemeWebsite - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a4a4a;">Welcome to MemeWebsite!</h2>
        <p>Hi there,</p>
        <p>Thanks for signing up! Please verify your email address to activate your account.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #ff5722; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Thanks,<br>The MemeWebsite Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending verification email');
    return false;
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: 'Welcome to MemeWebsite!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a4a4a;">Your account is now active!</h2>
        <p>Hi there,</p>
        <p>Thank you for verifying your email address. Your account is now fully activated.</p>
        <p>You can now enjoy all the features of MemeWebsite:</p>
        <ul style="color: #666;">
          <li>Create and share hilarious memes</li>
          <li>Upvote your favorite content</li>
          <li>Comment on memes</li>
        </ul>
        <div style="margin: 30px 0;">
          <a href="${process.env.CLIENT_BASE_URL}" style="background-color: #ff5722; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Exploring</a>
        </div>
        <p>Thanks,<br>The MemeWebsite Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending welcome email');
    return false;
  }
};

module.exports = {
  verifyEmailConfig,
  sendVerificationEmail,
  sendWelcomeEmail,
}; 