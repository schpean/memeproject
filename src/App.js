import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import CreateMeme from './pages/CreateMeme';
import BrowseMemes from './pages/BrowseMemes';
import CompanyPage from './pages/CompanyPage';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateMeme />} />
            <Route path="/browse" element={<BrowseMemes />} />
            <Route path="/company/:companyName" element={<CompanyPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
