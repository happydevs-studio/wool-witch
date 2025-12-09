import { useState } from 'react';
import { ShoppingBag, User, LogOut, UserCog, Menu, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import woolwitchLogo from '../assets/woolwitch.jpg';

interface HeaderProps {
  currentPage: 'shop' | 'cart' | 'checkout' | 'admin';
  onNavigate: (page: 'shop' | 'cart' | 'checkout' | 'admin') => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { itemCount } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('shop');
      setMobileMenuOpen(false);
    } catch (error) {
      // Keep minimal error logging for debugging
    }
  };

  const handleNavigation = (page: 'shop' | 'cart' | 'checkout' | 'admin') => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavigation('shop')}
            className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
          >
            <img 
              src={woolwitchLogo} 
              alt="Woolwitch Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg object-cover shadow-sm"
            />
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-gray-900">
                Woolwitch
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">Handmade with Love</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => handleNavigation('shop')}
              className={`font-medium transition-colors ${
                currentPage === 'shop'
                  ? 'text-rose-600'
                  : 'text-gray-700 hover:text-rose-600'
              }`}
            >
              Shop
            </button>
            {isAdmin && (
              <button
                onClick={() => handleNavigation('admin')}
                className={`font-medium transition-colors ${
                  currentPage === 'admin'
                    ? 'text-rose-600'
                    : 'text-gray-700 hover:text-rose-600'
                }`}
              >
                Admin
              </button>
            )}
            <a href="#" className="text-gray-700 hover:text-rose-600 transition-colors font-medium">
              About
            </a>
            <a href="#" className="text-gray-700 hover:text-rose-600 transition-colors font-medium">
              Contact
            </a>
          </nav>

          <div className="flex items-center space-x-1 sm:space-x-3">
            {user ? (
              <>
                {isAdmin && (
                  <div className="hidden md:flex items-center px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                    <UserCog className="w-4 h-4 mr-1" />
                    Admin
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden md:inline font-medium">Sign In</span>
              </button>
            )}
            <button
              onClick={() => handleNavigation('cart')}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-full transition-all ${
                currentPage === 'cart'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">{itemCount}</span>
            </button>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-3">
            <button
              onClick={() => handleNavigation('shop')}
              className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                currentPage === 'shop'
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Shop
            </button>
            {isAdmin && (
              <button
                onClick={() => handleNavigation('admin')}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-rose-50 text-rose-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Admin
              </button>
            )}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
              }}
              className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              About
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
              }}
              className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
}
