import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  FileWarning,
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
  { name: 'System Monitor', href: '/monitor', icon: Monitor, type: 'link' },
  { name: 'Logs', href: '/logs', icon: FileWarning, type: 'link' },
  { name: 'All Devices', href: '/devices', icon: Cpu, type: 'link' },
  { name: 'Apps', href: '/apps', icon: Package, type: 'link' },
  { name: 'Settings', href: '/settings', icon: Settings, type: 'link' },
  { name: 'divider', type: 'divider' },
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
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out z-40",
        // Mobile show/hide
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop width
        isCollapsed ? "lg:w-20" : "lg:w-72",
        // Mobile width
        "w-72"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
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
              <h1 className="text-xl font-bold text-foreground truncate">
                Virtue Admin
              </h1>
            </div>
          )}
          
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 cursor-pointer" />
          </button>
          
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
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
            {navigation.map((item, index) => {
              // Divider
              if (item.type === 'divider') {
                return <div key={index} className="my-2 border-t border-border"></div>;
              }

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
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {React.createElement(item.icon as React.ComponentType<any>, {
                      className: cn(
                        "flex-shrink-0 h-6 w-6",
                        isCollapsed ? "mr-0" : "mr-3",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                      )
                    })}
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              }

              // Button items
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
                      "group flex items-center w-full px-3 py-3 text-sm lg:text-base font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors relative",
                      isCollapsed ? "justify-center" : ""
                    )}
                    title={isCollapsed ? getDisplayName() : undefined}
                  >
                    {React.createElement(getIcon(), {
                      className: cn(
                        "flex-shrink-0 h-6 w-6",
                        isCollapsed ? "mr-0" : "mr-3"
                      )
                    })}
                    {!isCollapsed && <span className="truncate">{getDisplayName()}</span>}
                    
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
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
