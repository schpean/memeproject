import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const { currentUser, needsVerification, resendVerificationEmail } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const verified = queryParams.get('verified') === 'true';

  // Function to mask email for privacy
  const maskEmail = (email) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!username || !domain) return '***@***.com';
    
    const maskedUsername = username.length <= 2 
      ? '*'.repeat(username.length) 
      : username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.length > 1 
      ? '*'.repeat(domainParts[0].length) + '.' + domainParts.slice(1).join('.')
      : '*'.repeat(domain.length);
    
    return `${maskedUsername}@${maskedDomain}`;
  };

  const handleResendVerification = async () => {
    await resendVerificationEmail();
  };

  if (verified) {
    return (
      <div className="verify-email-container success">
        <h2>Email Verified Successfully!</h2>
        <p>Your email has been verified and your account is now active.</p>
        <p>You can now enjoy all the features of MemeWebsite.</p>
        <div className="actions">
          <Link to="/" className="btn primary">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="verify-email-container">
        <h2>Email Verification</h2>
        <p>You need to be logged in to verify your email.</p>
        <div className="actions">
          <Link to="/login" className="btn primary">Login</Link>
        </div>
      </div>
    );
  }

  if (!needsVerification) {
    return (
      <div className="verify-email-container success">
        <h2>Your Email is Already Verified</h2>
        <p>Your account is active and you can use all features.</p>
        <div className="actions">
          <Link to="/" className="btn primary">Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-email-container">
      <h2>Verify Your Email</h2>
      <p>We've sent a verification link to <strong>{currentUser.email ? maskEmail(currentUser.email) : 'your email'}</strong></p>
      <p>Please check your inbox and click the link to verify your email address.</p>
      
      <div className="info-box">
        <h3>Why verify your email?</h3>
        <ul>
          <li>Ensures your account security</li>
          <li>Protects your account from unauthorized access</li>
          <li>Allows you to recover your account if needed</li>
        </ul>
      </div>
      
      <div className="actions">
        <button onClick={handleResendVerification} className="btn secondary">
          Resend Verification Email
        </button>
        <Link to="/" className="btn primary">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail; 