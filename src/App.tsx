import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Shop } from './pages/Shop';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

function App() {
  const [currentPage, setCurrentPage] = useState<'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service'>('shop');

  const renderPage = () => {
    const handleCartNavigation = (page: 'shop' | 'cart' | 'checkout') => {
      setCurrentPage(page);
    };

    const handleCheckoutNavigation = (page: 'shop' | 'cart' | 'checkout') => {
      setCurrentPage(page);
    };

    switch (currentPage) {
      case 'shop':
        return <Shop />;
      case 'cart':
        return <Cart onNavigate={handleCartNavigation} />;
      case 'checkout':
        return <Checkout onNavigate={handleCheckoutNavigation} />;
      case 'admin':
        return <Admin />;
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      case 'privacy-policy':
        return <PrivacyPolicy onNavigate={setCurrentPage} />;
      case 'terms-of-service':
        return <TermsOfService onNavigate={setCurrentPage} />;
      default:
        return <Shop />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}

export default App;
