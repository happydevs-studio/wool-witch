import { useState } from 'react';
import { Heart, ShoppingBag, User, LogOut, UserCog } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  currentPage: 'shop' | 'cart' | 'checkout' | 'admin';
  onNavigate: (page: 'shop' | 'cart' | 'checkout' | 'admin') => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { itemCount } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('shop');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('shop')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
            <div className="text-left">
              <h1 className="text-3xl font-serif font-bold text-gray-900">
                Woolwitch
              </h1>
              <p className="text-sm text-gray-600">Handmade with Love</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => onNavigate('shop')}
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
                onClick={() => onNavigate('admin')}
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

          <div className="flex items-center space-x-3">
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
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all"
              >
                <User className="w-5 h-5" />
                <span className="hidden md:inline font-medium">Sign In</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('cart')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                currentPage === 'cart'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">{itemCount}</span>
            </button>
          </div>
        </div>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
}
