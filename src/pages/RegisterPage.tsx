import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, isRegistered, isAuthenticated } = useAuth();

  // Redirect if already registered or authenticated
  if (isRegistered) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const success = await register({
        name: formData.name,
        username: formData.username,
        password: formData.password,
      });

      if (success) {
        // Registration successful, will redirect to login
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md sm:max-w-lg lg:max-w-xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground">
            Create Admin Account
          </h2>
          <p className="mt-4 text-center text-base sm:text-lg lg:text-xl text-muted-foreground">
            Set up your Virtue Admin Dashboard
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-card rounded-lg shadow-xl p-6 sm:p-8 lg:p-10 space-y-6 border border-border">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 lg:px-6 lg:py-4 rounded text-sm sm:text-base">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="name" className="block text-base sm:text-lg lg:text-xl font-medium text-foreground mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5 border border-input placeholder-muted-foreground text-foreground bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base sm:text-lg lg:text-xl"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="username" className="block text-base sm:text-lg lg:text-xl font-medium text-foreground mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5 border border-input placeholder-muted-foreground text-foreground bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base sm:text-lg lg:text-xl"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-base sm:text-lg lg:text-xl font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5 border border-input placeholder-muted-foreground text-foreground bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base sm:text-lg lg:text-xl"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-base sm:text-lg lg:text-xl font-medium text-foreground mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5 border border-input placeholder-muted-foreground text-foreground bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring text-base sm:text-lg lg:text-xl"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 sm:py-4 lg:py-5 px-4 border border-transparent text-base sm:text-lg lg:text-xl font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
              >
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
