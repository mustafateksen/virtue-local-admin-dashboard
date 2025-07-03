import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  Settings, 
  Cpu, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
  Package
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
  { name: 'Monitor Streamers', href: '/monitor', icon: Monitor, type: 'link' },
  { name: 'All Devices', href: '/devices', icon: Cpu, type: 'link' },
  { name: 'Apps', href: '/apps', icon: Package, type: 'link' },
  { name: 'Settings', href: '/settings', icon: Settings, type: 'link' },
  { name: 'Theme Toggle', icon: 'theme', type: 'button', action: 'toggleTheme' },
  { name: 'Logout', icon: LogOut, type: 'button', action: 'logout' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed, 
  isMobileOpen, 
  setIsMobileOpen 
}) => {
  const location = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      default:
        return Sun;
    }
  };

  const getThemeName = () => {
    switch (theme) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      default:
        return 'Light Mode';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className={`fixed inset-0 z-40 lg:hidden ${
            theme === 'dark' ? 'bg-black/80' : 'bg-black/50'
          }`}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-screen border-r transition-all duration-300 ease-in-out z-40",
        // Theme-based background and border
        theme === 'dark' 
          ? 'bg-slate-900 border-slate-700' 
          : 'bg-white border-gray-200',
        // Mobile show/hide
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop width
        isCollapsed ? "lg:w-20" : "lg:w-72",
        // Mobile width
        "w-72"
      )}>
        {/* Header */}
        <div className={`flex items-center justify-between h-16 px-4 border-b ${
          theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
        }`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <img 
                src="/virtue24-square.png" 
                alt="Virtue Logo" 
                className={cn(
                  "w-8 h-8 transition-all duration-200",
                  theme === 'dark' ? "brightness-0 invert" : ""
                )}
              />
              <h1 className={`text-xl font-bold truncate ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Virtue Admin
              </h1>
            </div>
          )}
          
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className={`lg:hidden p-2 rounded-md transition-colors ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white hover:bg-slate-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
          
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex p-2 rounded-md transition-colors ${
              theme === 'dark' 
                ? 'text-gray-400 hover:text-white hover:bg-slate-800' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-6 w-6 cursor-pointer" />
            ) : (
              <ChevronLeft className="h-6 w-6 cursor-pointer" />
            )}
          </button>
        </div>

        <div className="flex flex-col h-full">
          {/* Navigation - positioned at top */}
          <nav className="px-3 py-4 space-y-1">
            {navigation.map((item) => {
              // Link items
              if (item.type === 'link') {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href!}
                    className={cn(
                      "group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors relative",
                      isActive
                        ? theme === 'dark' 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "bg-blue-500 text-white shadow-sm"
                        : theme === 'dark'
                          ? "text-gray-400 hover:bg-slate-800 hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {React.createElement(item.icon as React.ComponentType<any>, {
                      className: cn(
                        "flex-shrink-0 h-6 w-6",
                        isCollapsed ? "mr-0" : "mr-3",
                        isActive 
                          ? "text-white" 
                          : theme === 'dark'
                            ? "text-gray-400 group-hover:text-white"
                            : "text-gray-600 group-hover:text-gray-900"
                      )
                    })}
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className={`absolute left-full ml-2 px-2 py-1 text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 ${
                        theme === 'dark' 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              }

              // Button items - same styling as links
              if (item.type === 'button') {
                const handleClick = () => {
                  if (item.action === 'toggleTheme') {
                    toggleTheme();
                  } else if (item.action === 'logout') {
                    logout();
                  }
                };

                const getIcon = () => {
                  if (item.action === 'toggleTheme') {
                    return getThemeIcon();
                  }
                  return item.icon as React.ComponentType<any>;
                };

                const getDisplayName = () => {
                  if (item.action === 'toggleTheme') {
                    return getThemeName();
                  }
                  return item.name;
                };

                return (
                  <button
                    key={item.name}
                    onClick={handleClick}
                    className={cn(
                      "cursor-pointer group flex items-center w-full px-3 py-3 text-base font-medium rounded-lg transition-colors relative",
                      theme === 'dark'
                        ? "text-gray-400 hover:bg-slate-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    title={isCollapsed ? getDisplayName() : undefined}
                  >
                    {React.createElement(getIcon(), {
                      className: cn(
                        "flex-shrink-0 h-6 w-6",
                        isCollapsed ? "mr-0" : "mr-3",
                        theme === 'dark'
                          ? "text-gray-400 group-hover:text-white"
                          : "text-gray-600 group-hover:text-gray-900"
                      )
                    })}
                    {!isCollapsed && <span className="truncate">{getDisplayName()}</span>}
                    
                    {isCollapsed && (
                      <div className={`absolute left-full ml-2 px-2 py-1 text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 ${
                        theme === 'dark' 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}>
                        {getDisplayName()}
                      </div>
                    )}
                  </button>
                );
              }

              return null;
            })}
          </nav>

          {/* Spacer to push content to the very bottom if needed */}
          <div className="flex-1"></div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
