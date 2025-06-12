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
    checkRegistrationStatus();
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const checkRegistrationStatus = async (): Promise<boolean> => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/check-registration');
      const data = await response.json();
      setIsRegistered(data.isRegistered);
      return data.isRegistered;
    } catch (error) {
      console.error('Failed to check registration status:', error);
      // For now, assume not registered if API fails
      setIsRegistered(false);
      return false;
    }
  };

  const register = async (userData: { name: string; username: string; password: string }): Promise<boolean> => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        await response.json();
        setIsRegistered(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const userData: User = {
          id: data.id,
          name: data.name,
          username: data.username,
          role: data.role || 'admin',
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
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
