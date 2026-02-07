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
import Orders from './pages/Orders';
import { ProductDetails } from './pages/ProductDetails';

function App() {
  const [currentPage, setCurrentPage] = useState<'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service' | 'orders' | 'product-details'>('shop');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const renderPage = () => {
    const handleNavigation = (page: 'shop' | 'cart' | 'checkout') => {
      setCurrentPage(page);
    };

    const handleProductView = (productId: string) => {
      setSelectedProductId(productId);
      setCurrentPage('product-details');
    };

    const handleBackToShop = () => {
      setCurrentPage('shop');
      setSelectedProductId(null);
    };

    switch (currentPage) {
      case 'shop':
        return <Shop onViewProduct={handleProductView} />;
      case 'product-details':
        return selectedProductId ? (
          <ProductDetails productId={selectedProductId} onBack={handleBackToShop} />
        ) : (
          <Shop onViewProduct={handleProductView} />
        );
      case 'cart':
        return <Cart onNavigate={handleNavigation} />;
      case 'checkout':
        return <Checkout onNavigate={handleNavigation} />;
      case 'admin':
        return <Admin />;
      case 'orders':
        return <Orders />;
      case 'about':
        return <About />;
      case 'contact':
        return <Contact />;
      case 'privacy-policy':
        return <PrivacyPolicy onNavigate={setCurrentPage} />;
      case 'terms-of-service':
        return <TermsOfService onNavigate={setCurrentPage} />;
      default:
        return <Shop onViewProduct={handleProductView} />;
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
