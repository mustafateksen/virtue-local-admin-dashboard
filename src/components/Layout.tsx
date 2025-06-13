import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {isAuthenticated && (
        <Sidebar 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />
      )}
      
      <div className={cn(
        "flex-1 flex flex-col min-h-screen",
        isAuthenticated ? (isCollapsed ? "lg:ml-16" : "lg:ml-64") : ""
      )}>
        {isAuthenticated && (
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-accent transition-colors"
                onClick={() => setIsMobileOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="flex-1 flex justify-center lg:justify-start">
                <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground">
                  Admin Dashboard
                </h1>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <ThemeToggle />
              </div>
            </div>
          </header>
        )}
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
