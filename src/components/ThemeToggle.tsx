import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />;
      case 'dark':
        return <Moon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />;
      case 'system':
        return <Monitor className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />;
      default:
        return <Sun className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />;
    }
  };

  const getThemeName = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-4 rounded-lg text-sm sm:text-base lg:text-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
    >
      <span className="flex-shrink-0">{getIcon()}</span>
      <span className="hidden sm:inline truncate">{getThemeName()}</span>
    </button>
  );
};

export default ThemeToggle;
