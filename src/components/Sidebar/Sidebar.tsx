import { FC } from 'react';
import './Sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  return (
    <>
      <div
        className={`sidebar-container fixed left-0 top-0 z-40 h-full w-64 transform bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:h-auto md:min-h-full md:translate-x-0 md:flex-shrink-0`}
        role="navigation"
        aria-label="Primary"
      >
        <div className="flex h-full flex-col sidebar-inner bg-gray-50 p-4 shadow-lg">
          <div className="mb-8 space-y-4">
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
        </div>
      </div>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
