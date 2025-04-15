import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Funcție pentru ascunderea spinner-ului de loading
const hideLoadingSpinner = () => {
  const loadingElement = document.getElementById('app-loading');
  if (loadingElement) {
    // Mai întâi adăugăm clasa hidden pentru efect de fade-out
    loadingElement.classList.add('hidden');
    // Apoi eliminăm complet elementul după tranziție
    setTimeout(() => {
      loadingElement.remove();
    }, 300);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Ascunde spinner-ul după ce React este încărcat
// Adăugăm un mic delay pentru a ne asigura că UI-ul React este vizibil complet
window.addEventListener('load', () => {
  setTimeout(hideLoadingSpinner, 100);
});

// Ca backup, ascundem spinner-ul și după un timp maxim
// pentru a evita blocarea interfeței în caz de eroare
setTimeout(hideLoadingSpinner, 3000);
