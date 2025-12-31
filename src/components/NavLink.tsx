interface NavLinkProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ isActive, onClick, children, className = '' }: NavLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`font-medium transition-colors ${
        isActive
          ? 'text-rose-600'
          : 'text-gray-700 hover:text-rose-600'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface MobileNavLinkProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function MobileNavLink({ isActive, onClick, children }: MobileNavLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-rose-50 text-rose-600'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
