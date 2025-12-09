import React from 'react';

interface FooterProps {
  onNavigate: (page: 'privacy-policy' | 'terms-of-service' | 'about' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="text-lg mb-2">Made with love and care</p>
          <p className="text-gray-400">© 2024 Woolwitch. All rights reserved.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <button
            onClick={() => onNavigate('privacy-policy')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onNavigate('terms-of-service')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            Terms of Service
          </button>
          <button
            onClick={() => onNavigate('about')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            About Us
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="text-gray-400 hover:text-white transition-colors underline"
          >
            Contact
          </button>
        </div>
      </div>
    </footer>
  );
};