import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorPage from './pages/MonitorPage';
import LogsPage from './pages/LogsPage';
import DevicesPage from './pages/DevicesPage';
import AppsPage from './pages/AppsPage';
import SettingsPage from './pages/SettingsPage';
import LearnedProducts from './pages/LearnedProducts';

// Smart default route component
const DefaultRoute = () => {
  const { isAuthenticated, isRegistered } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  } else if (isRegistered) {
    return <Navigate to="/login" replace />;
  } else {
    return <Navigate to="/register" replace />;
  }
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="virtue-ui-theme">
      <AuthProvider>
        <FavoritesProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Private routes */}
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <DashboardPage />
                  </PrivateRoute>
                } />
                <Route path="/monitor" element={
                  <PrivateRoute>
                    <MonitorPage />
                  </PrivateRoute>
                } />
                <Route path="/logs" element={
                  <PrivateRoute>
                    <LogsPage />
                  </PrivateRoute>
                } />
                <Route path="/devices" element={
                  <PrivateRoute>
                    <DevicesPage />
                  </PrivateRoute>
                } />
                <Route path="/apps" element={
                  <PrivateRoute>
                    <AppsPage />
                  </PrivateRoute>
                } />
                <Route path="/settings" element={
                  <PrivateRoute>
                    <SettingsPage />
                  </PrivateRoute>
                } />
                <Route path="/learned-products" element={
                  <PrivateRoute>
                    <LearnedProducts />
                  </PrivateRoute>
                } />
                
                {/* Smart default redirect */}
                <Route path="/" element={<DefaultRoute />} />
              </Routes>
            </Layout>
          </Router>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
