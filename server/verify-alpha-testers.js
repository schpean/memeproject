/**
 * This script helps you verify multiple alpha tester email addresses in AWS SES.
 * 
 * To use this script:
 * 1. Add your alpha tester email addresses to the alphaTesters array below
 * 2. Run this script: node server/verify-alpha-testers.js
 * 3. Each alpha tester will receive a verification email from AWS
 * 4. They need to click the verification link in the email
 */

const alphaTesters = [
    'mateas.bogdan@gmail.com',
    // Add your alpha tester email addresses here
    // 'friend1@example.com',
    // 'friend2@example.com',
];

console.log('=== BossMe.me Alpha Tester Verification ===');
console.log(`Found ${alphaTesters.length} alpha tester email addresses to verify.`);
console.log('\nInstructions for each alpha tester:');
console.log('1. They will receive a verification email from AWS');
console.log('2. They need to click the verification link in the email');
console.log('3. Once verified, they can receive emails from BossMe.me');
console.log('\nTo verify these email addresses:');
console.log('1. Go to AWS SES Console: https://console.aws.amazon.com/ses/');
console.log('2. Click "Verified Identities" in the left sidebar');
console.log('3. Click "Create Identity"');
console.log('4. Choose "Email Address"');
console.log('5. Enter each email address and click "Create Identity"');
console.log('\nAlpha Tester Email Addresses:');
alphaTesters.forEach((email, index) => {
    console.log(`${index + 1}. ${email}`);
});

console.log('\nAfter verification, update your .env.production file with the correct SMTP credentials.');
console.log('Then run the email test script to verify everything is working:');
console.log('node server/test-email.js'); 