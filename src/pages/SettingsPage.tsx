import React, { useState } from 'react';
import { User, Shield, Bell, Monitor, Palette, Save, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'account',
    title: 'Account',
    icon: <User className="w-5 h-5" />,
    description: 'Manage your account settings and profile'
  },
  {
    id: 'security',
    title: 'Security',
    icon: <Shield className="w-5 h-5" />,
    description: 'Configure security and authentication settings'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: <Bell className="w-5 h-5" />,
    description: 'Set up alerts and notification preferences'
  },
  {
    id: 'system',
    title: 'System',
    icon: <Monitor className="w-5 h-5" />,
    description: 'System-wide settings and configurations'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: <Palette className="w-5 h-5" />,
    description: 'Customize the look and feel of the dashboard'
  }
];

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('account');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(30);
  const [dataRetention, setDataRetention] = useState(90);

  const handleSave = async (section: string) => {
    setIsLoading(true);
    // Simulate API call for the specific section
    console.log(`Saving ${section} settings...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    // Show success message
  };

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value="admin@raspberrypi.local"
              disabled
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-base lg:text-lg opacity-60"
            />
            <p className="text-sm lg:text-base text-muted-foreground mt-1">
              Email cannot be changed for the admin account
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm lg:text-base text-muted-foreground">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-base lg:text-lg">
              Enable
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">Session Timeout</p>
              <p className="text-sm lg:text-base text-muted-foreground">Automatically log out after inactivity</p>
            </div>
            <select className="px-3 py-2 bg-background border border-border rounded-lg text-base lg:text-lg">
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="480">8 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Access Control</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">SSH Access</p>
              <p className="text-sm lg:text-base text-muted-foreground">Allow SSH connections to this device</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">API Access</p>
              <p className="text-sm lg:text-base text-muted-foreground">Allow external API requests</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Alert Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">Email Notifications</p>
              <p className="text-sm lg:text-base text-muted-foreground">Receive alerts via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">Push Notifications</p>
              <p className="text-sm lg:text-base text-muted-foreground">Browser push notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-base lg:text-lg font-medium text-foreground">Critical Alerts</p>
              <p className="text-sm lg:text-base text-muted-foreground">High priority system alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={criticalAlerts}
                onChange={(e) => setCriticalAlerts(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Dashboard Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Auto Refresh Interval
            </label>
            <select 
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
              <option value={0}>Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm lg:text-base font-medium text-foreground mb-2">
              Data Retention (days)
            </label>
            <input
              type="number"
              value={dataRetention}
              onChange={(e) => setDataRetention(Number(e.target.value))}
              min="1"
              max="365"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base lg:text-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Backup & Restore</h3>
        <div className="space-y-4">
          <button className="flex items-center gap-2 w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-base lg:text-lg">
            <Download className="w-5 h-5" />
            Export Configuration
          </button>
          <button className="flex items-center gap-2 w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-base lg:text-lg">
            <Upload className="w-5 h-5" />
            Import Configuration
          </button>
          <button className="flex items-center gap-2 w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-base lg:text-lg">
            <Trash2 className="w-5 h-5" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg lg:text-xl font-semibold text-foreground mb-4">Theme</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['light', 'dark', 'system'].map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => setTheme(themeOption as 'light' | 'dark' | 'system')}
              className={`p-4 rounded-lg border-2 transition-colors text-base lg:text-lg capitalize ${
                theme === themeOption
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted hover:bg-muted/80'
              }`}
            >
              {themeOption}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'account': return renderAccountSettings();
      case 'security': return renderSecuritySettings();
      case 'notifications': return renderNotificationSettings();
      case 'system': return renderSystemSettings();
      case 'appearance': return renderAppearanceSettings();
      default: return renderAccountSettings();
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-base lg:text-lg text-muted-foreground">
          Configure your dashboard and system preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-base lg:text-lg ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {section.icon}
                <div>
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm opacity-80 hidden lg:block">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-card shadow rounded-lg border border-border p-6 lg:p-8">
            {renderContent()}
            
            {/* Save Button */}
            <div className="flex justify-end mt-8 pt-6 border-t border-border">
              <button
                onClick={() => handleSave(activeSection)}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-base lg:text-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
