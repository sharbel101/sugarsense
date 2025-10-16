import { FC } from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose, onLogout }) => {
  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    window.location.href = '/login';
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

          {onLogout && (
            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
