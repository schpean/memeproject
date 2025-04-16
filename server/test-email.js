/**
 * Test Email Sender for bossme.me Alpha
 * 
 * This script tests the email functionality by sending test emails to the verified email address.
 * Make sure to update the TEST_EMAIL_ADDRESS variable with an email that is verified in AWS SES.
 * 
 * Usage:
 * - node server/test-email.js
 */

// Load environment variables
require('dotenv').config();

// Import email service
const emailService = require('./services/emailService');

// ⚠️ IMPORTANT: Use a verified email address in AWS SES sandbox
const TEST_EMAIL_ADDRESS = 'mateas.bogdan@gmail.com'; // Replace with your verified email

// Test user object
const testUser = {
  email: TEST_EMAIL_ADDRESS,
  nickname: 'Alpha Tester'
};

// Verification and reset tokens for testing
const MOCK_VERIFICATION_TOKEN = 'test-verification-token-12345';
const MOCK_RESET_TOKEN = 'test-reset-token-12345';

// Utility to format console output
const formatOutput = (success, message) => {
  return success ? `✅ ${message}` : `❌ ${message}`;
};

// Main test function
async function runTests() {
  console.log('=============================================');
  console.log('🧪 STARTING ALPHA EMAIL TESTING');
  console.log('=============================================');
  console.log(`📧 Using test email: ${TEST_EMAIL_ADDRESS}`);
  console.log('---------------------------------------------');

  let allTestsPassed = true;
  
  try {
    // Verify email service connection
    console.log('Verifying email service connection...');
    const connectionResult = await emailService.verifyConnection();
    console.log(formatOutput(connectionResult.success, 'Email service connection test'));
    
    if (!connectionResult.success) {
      throw new Error(`Email connection failed: ${connectionResult.error}`);
    }
    
    // Test welcome email
    console.log('\nTesting welcome email...');
    await emailService.sendWelcomeEmail(testUser);
    console.log(formatOutput(true, 'Welcome email test'));
    
    // Test verification email
    console.log('\nTesting verification email...');
    await emailService.sendVerificationEmail(testUser, MOCK_VERIFICATION_TOKEN);
    console.log(formatOutput(true, 'Verification email test'));
    
    // Test password reset email
    console.log('\nTesting password reset email...');
    await emailService.sendPasswordResetEmail(testUser, MOCK_RESET_TOKEN);
    console.log(formatOutput(true, 'Password reset email test'));
    
    console.log('\n---------------------------------------------');
    console.log('✅ All email tests completed successfully!');
    
  } catch (error) {
    allTestsPassed = false;
    console.error('\n❌ Email test failed:');
    console.error(error.message);
    
    console.log('\n📋 Troubleshooting tips:');
    console.log('1. Verify your AWS SES credentials in .env file');
    console.log('2. Make sure your test email is verified in AWS SES');
    console.log('3. Check if AWS SES is in sandbox mode and properly set up');
    console.log('4. Ensure your server can connect to AWS SES (no firewall issues)');
  } finally {
    console.log('\n=============================================');
    console.log(formatOutput(allTestsPassed, 'EMAIL TEST SUMMARY'));
    console.log('=============================================');
    
    // Exit with appropriate code
    process.exit(allTestsPassed ? 0 : 1);
  }
}

// Run the tests
runTests(); 