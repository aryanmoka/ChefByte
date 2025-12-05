import React from 'react';
import { Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  fixed?: boolean; // set true if you want a fixed header at top
  onMenuClick?: () => void; // optional handler for mobile menu button
}

const Header: React.FC<HeaderProps> = ({ fixed = false, onMenuClick }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className={`w-full z-40 transition-colors duration-300 ${
        fixed ? 'fixed top-0 left-0' : 'relative'
      } bg-gradient-to-r from-orange-600/95 to-orange-500/95 dark:bg-gray-900/95 shadow`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            {/* Optional mobile menu button */}
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                aria-label="Open menu"
                className="p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 sm:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-baseline gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-white leading-none">Chef Byte</h1>
              <span className="hidden sm:inline text-sm text-orange-100/90">Your Digital Sous Chef</span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              aria-pressed={isDark}
              className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
              title="Toggle light / dark"
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
