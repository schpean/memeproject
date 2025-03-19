import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} MemeManagerRants</p>
        <p>Anonymously rant about managers through memes!</p>
      </div>
    </footer>
  );
}

export default Footer;