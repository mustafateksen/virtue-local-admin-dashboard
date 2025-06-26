import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: { name: string; username: string; password: string }) => Promise<boolean>;
  logout: () => void;
  checkRegistrationStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  const isAuthenticated = !!user;

  // Check registration status on mount
  useEffect(() => {
    // Temporarily disable API calls to prevent infinite loops
    console.log('AuthContext mounted');
    setIsRegistered(true); // Assume registered for now
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const checkRegistrationStatus = async (): Promise<boolean> => {
    // Temporarily return true to prevent API calls
    console.log('checkRegistrationStatus called - returning true');
    setIsRegistered(true);
    return true;
  };

  const register = async (userData: { name: string; username: string; password: string }): Promise<boolean> => {
    // Simplified register for testing
    console.log('Register attempt:', userData.username);
    setIsRegistered(true);
    return true;
  };

  const login = async (username: string, _password: string): Promise<boolean> => {
    // Simplified login for testing - accept any credentials
    console.log('Login attempt:', username);
    const user: User = {
      id: '1',
      username: username,
      name: username,
      role: 'admin',
    };
    
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isRegistered,
        login,
        register,
        logout,
        checkRegistrationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
