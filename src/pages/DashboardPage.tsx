import React from 'react';
import { Monitor, HardDrive, Cpu, Wifi, Activity, Server } from 'lucide-react';

const DashboardCard: React.FC<{
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subValue, icon, color }) => (
  <div className="bg-card rounded-lg shadow border border-border p-6">
    <div className="flex items-center">
      <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="ml-5 w-0 flex-1">
        <dl>
          <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
          <dd className="text-lg font-medium text-foreground">{value}</dd>
          {subValue && (
            <dd className="text-sm text-muted-foreground">{subValue}</dd>
          )}
        </dl>
      </div>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  // Mock data - these will be replaced with real API calls
  const systemStats = [
    {
      title: 'CPU Usage',
      value: '45%',
      subValue: '2.1 GHz',
      icon: <Cpu className="h-6 w-6 text-white" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Memory Usage',
      value: '2.8 GB',
      subValue: '70% of 4GB',
      icon: <Monitor className="h-6 w-6 text-white" />,
      color: 'bg-green-500',
    },
    {
      title: 'Disk Space',
      value: '45.2 GB',
      subValue: '60% of 75GB',
      icon: <HardDrive className="h-6 w-6 text-white" />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Network',
      value: 'Connected',
      subValue: '192.168.1.100',
      icon: <Wifi className="h-6 w-6 text-white" />,
      color: 'bg-purple-500',
    },
  ];

  const connectedDevices = [
    { name: 'Raspberry Pi #001', ip: '192.168.1.101', status: 'Online', uptime: '2d 5h' },
    { name: 'Raspberry Pi #002', ip: '192.168.1.102', status: 'Online', uptime: '1d 12h' },
    { name: 'Raspberry Pi #003', ip: '192.168.1.103', status: 'Offline', uptime: '-' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Overview of your Raspberry Pi cluster and system status
        </p>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {systemStats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="bg-card shadow rounded-lg border border-border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-foreground">System Health</span>
                </div>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-foreground">Uptime</span>
                </div>
                <span className="text-sm font-medium text-foreground">5d 12h 34m</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="h-5 w-5 text-purple-500 mr-2" />
                  <span className="text-sm text-foreground">Load Average</span>
                </div>
                <span className="text-sm font-medium text-foreground">0.65, 0.58, 0.42</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-card shadow rounded-lg border border-border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
              Connected Devices
            </h3>
            <div className="space-y-3">
              {connectedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-foreground">{device.name}</p>
                    <p className="text-xs text-muted-foreground">{device.ip}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      device.status === 'Online' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {device.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">{device.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card shadow rounded-lg border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Monitor className="h-4 w-4 mr-2" />
              System Monitor
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <HardDrive className="h-4 w-4 mr-2" />
              Storage Manager
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Wifi className="h-4 w-4 mr-2" />
              Network Config
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Server className="h-4 w-4 mr-2" />
              Device Manager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
