import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorPage from './pages/MonitorPage';
import LogsPage from './pages/LogsPage';
import NetworkPage from './pages/NetworkPage';
import DevicesPage from './pages/DevicesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="virtue-ui-theme">
      <AuthProvider>
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
              <Route path="/network" element={
                <PrivateRoute>
                  <NetworkPage />
                </PrivateRoute>
              } />
              <Route path="/devices" element={
                <PrivateRoute>
                  <DevicesPage />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <SettingsPage />
                </PrivateRoute>
              } />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/register" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
