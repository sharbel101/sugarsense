import { FC } from 'react';
import './Header.css';

const Header: FC = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-20 h-16 bg-green-500 shadow-lg">
      <div className="flex h-full items-center justify-center px-4">
        <h1 className="text-center text-2xl font-bold text-white md:text-3xl">
          SugarSense
        </h1>
      </div>
    </header>
  );
};

export default Header;