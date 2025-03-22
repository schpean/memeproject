import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} bossme.me</p>
        <p>Anonymously rant about managers or colleagues through memes!</p>
      </div>
    </footer>
  );
}

export default Footer;