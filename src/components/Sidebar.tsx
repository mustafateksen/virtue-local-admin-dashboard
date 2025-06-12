import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  HardDrive, 
  Network, 
  Settings, 
  Users, 
  LogOut,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System Monitor', href: '/monitor', icon: Monitor },
  { name: 'Storage', href: '/storage', icon: HardDrive },
  { name: 'Network', href: '/network', icon: Network },
  { name: 'Raspberry Devices', href: '/devices', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 sm:w-80 lg:w-72 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 lg:h-20 px-6 border-b border-border">
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Virtue Admin</h1>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col h-full">
          <nav className="flex-1 px-4 lg:px-6 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-4 py-3 lg:py-4 text-base lg:text-lg font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-4 flex-shrink-0 h-6 w-6 lg:h-7 lg:w-7",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-border p-4 lg:p-6">
            <div className="flex items-center mb-4 lg:mb-6">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-base lg:text-lg font-medium text-secondary-foreground">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-4 min-w-0 flex-1">
                <p className="text-base lg:text-lg font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-sm lg:text-base text-muted-foreground truncate">@{user?.username}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-4 py-3 lg:py-4 text-base lg:text-lg font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="mr-4 h-6 w-6 lg:h-7 lg:w-7 text-muted-foreground" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
