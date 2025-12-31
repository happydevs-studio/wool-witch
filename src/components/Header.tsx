import { useState } from 'react';
import { ShoppingBag, User, LogOut, UserCog, Menu, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { NavLink, MobileNavLink } from './NavLink';
import woolwitchLogo from '../assets/woolwitch.jpg';

interface HeaderProps {
  currentPage: 'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service' | 'orders';
  onNavigate: (page: 'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service' | 'orders') => void;
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
    } catch {
      // Keep minimal error logging for debugging
    }
  };

  const handleNavigation = (page: 'shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact' | 'privacy-policy' | 'terms-of-service' | 'orders') => {
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
            <NavLink isActive={currentPage === 'shop'} onClick={() => handleNavigation('shop')}>
              Shop
            </NavLink>
            {isAdmin && (
              <NavLink isActive={currentPage === 'admin'} onClick={() => handleNavigation('admin')}>
                Admin
              </NavLink>
            )}
            {user && (
              <NavLink isActive={currentPage === 'orders'} onClick={() => handleNavigation('orders')}>
                My Orders
              </NavLink>
            )}
            <NavLink isActive={currentPage === 'about'} onClick={() => handleNavigation('about')}>
              About
            </NavLink>
            <NavLink isActive={currentPage === 'contact'} onClick={() => handleNavigation('contact')}>
              Contact
            </NavLink>
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
            <MobileNavLink isActive={currentPage === 'shop'} onClick={() => handleNavigation('shop')}>
              Shop
            </MobileNavLink>
            {isAdmin && (
              <MobileNavLink isActive={currentPage === 'admin'} onClick={() => handleNavigation('admin')}>
                Admin
              </MobileNavLink>
            )}
            {user && (
              <MobileNavLink isActive={currentPage === 'orders'} onClick={() => handleNavigation('orders')}>
                My Orders
              </MobileNavLink>
            )}
            <MobileNavLink isActive={currentPage === 'about'} onClick={() => handleNavigation('about')}>
              About
            </MobileNavLink>
            <MobileNavLink isActive={currentPage === 'contact'} onClick={() => handleNavigation('contact')}>
              Contact
            </MobileNavLink>
          </nav>
        </div>
      )}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
}
