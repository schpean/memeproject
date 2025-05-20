import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Howto from './pages/Howto';
import BrowseMemes from './pages/BrowseMemes';
import CompanyPage from './pages/CompanyPage';
import NotFound from './pages/NotFound';
import MemePage from './pages/MemePage';
import CommentsPage from './pages/CommentsPage';
import AdminPanel from './pages/AdminPanel';
import PendingMemes from './pages/PendingMemes';
import UserDetails from './pages/UserDetails';
import MyMemes from './pages/MyMemes';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Disclaimer from './pages/Disclaimer';
import Contact from './pages/Contact';
import CookiePolicy from './pages/CookiePolicy';
import EmailLoginModal from './components/auth/EmailLoginModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/common/Notification';
import VerifyEmail from './components/auth/VerifyEmail';
import { setAuthContextGetter } from './api/api';
import CookieBanner from './components/ui/CookieBanner';

// Component care conectează AuthContext cu api.js
const AuthContextConnector = ({ children }) => {
  const auth = useAuth();
  
  useEffect(() => {
    // Conectăm AuthContext cu api.js pentru a permite accesul la funcțiile de loading global
    setAuthContextGetter(() => ({
      startGlobalLoading: auth.startGlobalLoading,
      stopGlobalLoading: auth.stopGlobalLoading,
      globalLoading: auth.globalLoading
    }));
  }, [auth]);
  
  return <>{children}</>;
};

function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AuthContextConnector>
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
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin/users/:id" element={<UserDetails />} />
                  <Route path="/pending" element={<PendingMemes />} />
                  <Route path="/mymemes" element={<MyMemes />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/cookies" element={<CookiePolicy />} />
                  <Route path="/login" element={<EmailLoginModal />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <CookieBanner />
              <EmailLoginModal />
            </div>
          </AuthContextConnector>
        </Router>
      </NotificationProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
