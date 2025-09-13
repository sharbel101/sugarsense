import { FC, useState } from 'react';
import './Sidebar.css';

const Sidebar: FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-menu-button fixed left-4 top-4 z-50 rounded-full bg-green-500 p-2 text-white shadow-lg md:hidden"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col rounded-r-3xl bg-gray-50 p-4 shadow-lg">
          <div className="mb-8 mt-16 space-y-4">
            {/* Add your sidebar content here */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700">Menu Item 1</h3>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700">Menu Item 2</h3>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700">Menu Item 3</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;