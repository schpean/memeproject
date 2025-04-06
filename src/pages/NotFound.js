import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="not-found-page">
      <h1>404 - What are you doing here?</h1>
      <p>You clearly have reached the end of memenet.</p>
      <Link to="/">Return to Home</Link>
    </div>
  );
}

export default NotFound;