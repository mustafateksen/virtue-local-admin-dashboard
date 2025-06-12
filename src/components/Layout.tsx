import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isAuthenticated && (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      )}
      
      <div className={`${isAuthenticated ? 'lg:ml-64' : ''}`}>
        {isAuthenticated && (
          <div className="sticky top-0 z-40 lg:mx-auto lg:max-w-7xl lg:px-8">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-0 bg-card border-b border-border">
              <button
                type="button"
                className="lg:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <div className="flex-1 flex justify-center lg:justify-start">
                <h2 className="text-xl font-semibold text-foreground">
                  Admin Dashboard
                </h2>
              </div>

              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
        
        <main className={`${isAuthenticated ? 'py-6' : ''}`}>
          <div className={`${isAuthenticated ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
