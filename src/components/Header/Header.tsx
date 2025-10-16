import { FC } from 'react';
import './Header.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onBack?: () => void;
}

const Header: FC<HeaderProps> = ({ onToggleSidebar, onBack }) => {
  const leadingAction = onBack
    ? {
        onClick: onBack,
        icon: 'back' as const,
        ariaLabel: 'Go back',
      }
    : onToggleSidebar
    ? {
        onClick: onToggleSidebar,
        icon: 'menu' as const,
        ariaLabel: 'Open menu',
      }
    : null;

  return (
    <header className="app-header bg-green-500" role="banner" style={{ height: 'var(--header-height)' }}>
      <div className="flex h-full items-center justify-center" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        {/* Mobile menu button (left) */}
        {leadingAction && (
          <button
            onClick={leadingAction.onClick}
            className="mobile-menu-button absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-green-600 p-3 text-white shadow-lg"
            aria-label={leadingAction.ariaLabel}
          >
            {leadingAction.icon === 'menu' ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        )}

        <h1 className="text-center text-2xl font-bold text-white md:text-3xl select-none">
          SugarSense
        </h1>
      </div>
    </header>
  );
};

export default Header;
