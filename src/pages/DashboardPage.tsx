import React from 'react';
import { Monitor, HardDrive, Cpu, Wifi, Activity, Server,FileWarning } from 'lucide-react';

const DashboardCard: React.FC<{
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subValue, icon, color }) => (
  <div className="bg-card rounded-lg shadow border border-border p-6 lg:p-8 hover:shadow-lg transition-shadow">
    <div className="flex items-center">
      <div className={`flex-shrink-0 p-3 lg:p-4 rounded-lg ${color}`}>
        <div className="h-6 w-6 lg:h-8 lg:w-8">{icon}</div>
      </div>
      <div className="ml-5 lg:ml-6 w-0 flex-1">
        <dl>
          <dt className="text-sm lg:text-base font-medium text-muted-foreground truncate">{title}</dt>
          <dd className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">{value}</dd>
          {subValue && (
            <dd className="text-sm lg:text-base text-muted-foreground">{subValue}</dd>
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
      icon: <Cpu className="h-full w-full text-primary-foreground" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Memory Usage',
      value: '2.8 GB',
      subValue: '70% of 4GB',
      icon: <Monitor className="h-full w-full text-primary-foreground" />,
      color: 'bg-green-500',
    },
    {
      title: 'Disk Space',
      value: '45.2 GB',
      subValue: '60% of 75GB',
      icon: <HardDrive className="h-full w-full text-primary-foreground" />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Network',
      value: 'Connected',
      subValue: '192.168.1.100',
      icon: <Wifi className="h-full w-full text-primary-foreground" />,
      color: 'bg-purple-500',
    },
  ];

  const connectedDevices = [
    { name: 'Raspberry Pi #001', ip: '192.168.1.101', status: 'Online', uptime: '2d 5h' },
    { name: 'Raspberry Pi #002', ip: '192.168.1.102', status: 'Online', uptime: '1d 12h' },
    { name: 'Raspberry Pi #003', ip: '192.168.1.103', status: 'Offline', uptime: '-' },
  ];

  return (
    <div className="space-y-8 lg:space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-3 lg:mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
          Overview of your Raspberry Pi cluster and system status
        </p>
      </div>

      {/* System Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {systemStats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* System Status */}
        <div className="bg-card shadow rounded-lg border border-border hover:shadow-lg transition-shadow">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-xl lg:text-2xl xl:text-3xl leading-6 font-bold text-foreground mb-6">
              System Status
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-6 w-6 lg:h-7 lg:w-7 text-green-500 mr-3 lg:mr-4" />
                  <span className="text-base lg:text-lg text-foreground">System Health</span>
                </div>
                <span className="text-base lg:text-lg font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-6 w-6 lg:h-7 lg:w-7 text-blue-500 mr-3 lg:mr-4" />
                  <span className="text-base lg:text-lg text-foreground">Uptime</span>
                </div>
                <span className="text-base lg:text-lg font-medium text-foreground">5d 12h 34m</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="h-6 w-6 lg:h-7 lg:w-7 text-purple-500 mr-3 lg:mr-4" />
                  <span className="text-base lg:text-lg text-foreground">Load Average</span>
                </div>
                <span className="text-base lg:text-lg font-medium text-foreground">0.65, 0.58, 0.42</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-card shadow rounded-lg border border-border hover:shadow-lg transition-shadow">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-xl lg:text-2xl xl:text-3xl leading-6 font-bold text-foreground mb-6">
              Connected Devices
            </h3>
            <div className="space-y-4">
              {connectedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-4 lg:p-5 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-base lg:text-lg font-medium text-foreground truncate">{device.name}</p>
                    <p className="text-sm lg:text-base text-muted-foreground">{device.ip}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-flex px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base font-semibold rounded-full ${
                      device.status === 'Online' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-400'
                    }`}>
                      {device.status}
                    </span>
                    <p className="text-sm lg:text-base text-muted-foreground mt-1">{device.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card shadow rounded-lg border border-border hover:shadow-lg transition-shadow">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-xl lg:text-2xl xl:text-3xl leading-6 font-bold text-foreground mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <button className="flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-base lg:text-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md">
              <Monitor className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>System Monitor</span>
            </button>
            <button className="flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-base lg:text-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md">
              <FileWarning className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Log Manager</span>
            </button>
            <button className="flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-base lg:text-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md">
              <Wifi className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Network Config</span>
            </button>
            <button className="flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-base lg:text-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md">
              <Server className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Device Manager</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
