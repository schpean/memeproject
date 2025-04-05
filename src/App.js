import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Howto from './pages/Howto';
import BrowseMemes from './pages/BrowseMemes';
import CompanyPage from './pages/CompanyPage';
import NotFound from './pages/NotFound';
import MemePage from './pages/MemePage';
import CommentsPage from './pages/CommentsPage';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/howto" element={<Howto />} />
              <Route path="/browse" element={<BrowseMemes />} />
              <Route path="/company/:companyName" element={<CompanyPage />} />
              <Route path="/meme/:id" element={<MemePage />} />
              <Route path="/meme/:id/comments" element={<CommentsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
