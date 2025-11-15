import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';
import { clearUserFromStorage } from '@/features/user/userStorage';
import { supabase } from '@/api/supabaseClient';
import { useDispatch } from 'react-redux';
import { resetUser } from '@/features/user/userSlice';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose, onLogout }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogoutClick = () => {
    console.log('=== LOGOUT BUTTON CLICKED ===');
    console.log('onLogout prop exists:', !!onLogout);
    
    // Sign out from Supabase auth
    console.log('Attempting Supabase sign-out...');
    try {
      supabase.auth.signOut();
      console.log('✓ Supabase sign-out successful');
    } catch (e) {
      console.error('✗ Error signing out from Supabase', e);
    }

    // Reset Redux user state
    console.log('Dispatching resetUser...');
    try {
      dispatch(resetUser());
      console.log('✓ Redux user reset');
    } catch (e) {
      console.error('✗ Error resetting Redux:', e);
    }

    // Let parent perform its cleanup (if provided)
    console.log('Calling parent onLogout callback...');
    if (onLogout) {
      try {
        onLogout();
        console.log('✓ Parent onLogout callback executed');
      } catch (e) {
        console.error('✗ Error in parent logout', e);
      }
    } else {
      console.warn('! No onLogout callback provided');
    }

    // Ensure persisted profile is removed
    console.log('Clearing local storage...');
    try {
      clearUserFromStorage();
      console.log('✓ Storage cleared');
    } catch (e) {
      console.error('✗ Error clearing storage', e);
    }

    // Use react-router navigation to go to the Login page
    console.log('Navigating to /login...');
    navigate('/login', { replace: true });
    console.log('=== END LOGOUT ===');
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-white transition-transform duration-300 ease-in-out sidebar-container ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col sidebar-inner bg-gray-50 p-4 shadow-lg">
          <div className="mb-8 space-y-4">
            {/* Add your sidebar content here */}
            <div className="sidebar-option">
              <h3 className="text-lg font-semibold text-gray-800">New Chat</h3>
            </div>
            <div className="sidebar-option">
              <h3 className="text-lg font-semibold text-gray-800">History</h3>
            </div>
            <div className="sidebar-option">
              <h3 className="text-lg font-semibold text-gray-800">Settings</h3>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden sidebar-overlay"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
