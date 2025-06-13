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
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System Monitor', href: '/monitor', icon: Monitor },
  { name: 'Storage', href: '/storage', icon: HardDrive },
  { name: 'Network', href: '/network', icon: Network },
  { name: 'Raspberry Devices', href: '/devices', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed, 
  isMobileOpen, 
  setIsMobileOpen 
}) => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 ease-in-out z-50",
        // Mobile
        "lg:relative lg:z-auto",
        // Mobile show/hide
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop width
        isCollapsed ? "lg:w-16" : "lg:w-64",
        // Mobile width
        "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-foreground truncate">
              Virtue Admin
            </h1>
          )}
          
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Desktop collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 h-6 w-6",
                      isCollapsed ? "mr-0" : "mr-3",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-3">
            <div className={cn(
              "flex items-center mb-3",
              isCollapsed ? "justify-center" : ""
            )}>
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-sm font-medium text-secondary-foreground">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                </div>
              )}
            </div>
            
            <button
              onClick={logout}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group",
                isCollapsed ? "justify-center" : ""
              )}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className={cn(
                "h-5 w-5 text-muted-foreground",
                isCollapsed ? "mr-0" : "mr-3"
              )} />
              {!isCollapsed && <span>Logout</span>}
              
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Logout
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
