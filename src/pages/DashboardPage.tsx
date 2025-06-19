import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, HardDrive, Cpu, Activity, Server, FileWarning, ArrowRight, Package } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const DashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const connectedDevices = [
    { name: 'Compute Module #001', ip: '192.168.1.101', status: 'Online', uptime: '2d 5h' },
    { name: 'Compute Module #002', ip: '192.168.1.102', status: 'Online', uptime: '1d 12h' },
    { name: 'Compute Module #003', ip: '192.168.1.103', status: 'Offline', uptime: '-' },
  ];

  return (
    <div className="space-y-8 lg:space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
          Overview of your Main Terminal Cluster and System status
        </p>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* System Status */}
        <div className="bg-card shadow rounded-lg border border-border hover:shadow-lg transition-shadow">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-lg lg:text-xl leading-6 font-bold text-foreground mb-6">
              Main Terminal
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="h-6 w-6 lg:h-7 lg:w-7 text-blue-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">CPU Usage</span>
                </div>
                <div className="text-right">
                  <span className="text-sm lg:text-base font-medium text-foreground">45%</span>
                  <p className="text-sm text-muted-foreground">2.1 GHz</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Monitor className="h-6 w-6 lg:h-7 lg:w-7 text-green-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">Memory Usage</span>
                </div>
                <div className="text-right">
                  <span className="text-sm lg:text-base font-medium text-foreground">2.8 GB</span>
                  <p className="text-sm text-muted-foreground">70% of 4GB</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HardDrive className="h-6 w-6 lg:h-7 lg:w-7 text-yellow-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">Disk Space</span>
                </div>
                <div className="text-right">
                  <span className="text-sm lg:text-base font-medium text-foreground">45.2 GB</span>
                  <p className="text-sm text-muted-foreground">60% of 75GB</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-6 w-6 lg:h-7 lg:w-7 text-purple-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">Network</span>
                </div>
                <div className="text-right">
                  <span className="text-sm lg:text-base font-medium text-green-600">Connected</span>
                  <p className="text-sm text-muted-foreground">192.168.1.100</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-6 w-6 lg:h-7 lg:w-7 text-green-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">System Health</span>
                </div>
                <span className="text-sm lg:text-base font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Server className="h-6 w-6 lg:h-7 lg:w-7 text-blue-500 mr-3 lg:mr-4" />
                  <span className="text-sm lg:text-base text-foreground">Uptime</span>
                </div>
                <span className="text-sm lg:text-base font-medium text-foreground">5d 12h 34m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div className="bg-card shadow rounded-lg border border-border hover:shadow-lg transition-shadow">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-xl lg:text-2xl xl:text-3xl leading-6 font-bold text-foreground mb-6">
              Connected I/O Units
            </h3>
            <div className="space-y-4">
              {connectedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-4 lg:p-5 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm lg:text-base font-medium text-foreground truncate">{device.name}</p>
                    <p className="text-sm lg:text-base text-muted-foreground">{device.ip}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-flex px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base font-semibold rounded-full ${
                      device.status === 'Online' 
                        ? theme === 'dark' ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-800'
                        : theme === 'dark' ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-800'
                    }`}>
                      {device.status}
                    </span>
                    <p className="text-sm lg:text-base text-muted-foreground mt-1">{device.uptime}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* See All Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => navigate('/devices')}
                className="cursor-pointer flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm lg:text-base font-medium"
              >
                See All
                <ArrowRight className="h-4 w-4" />
              </button>
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
            <button 
              onClick={() => navigate('/monitor')}
              className="cursor-pointer flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-sm lg:text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
            >
              <Monitor className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>System Monitor</span>
            </button>
            <button 
              onClick={() => navigate('/logs')}
              className="cursor-pointer flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-sm lg:text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
            >
              <FileWarning className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Logs</span>
            </button>
            <button 
              onClick={() => navigate('/devices')}
              className="cursor-pointer flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-sm lg:text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
            >
              <Cpu className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>All Devices</span>
            </button>
            <button 
              onClick={() => navigate('/apps')}
              className="cursor-pointer flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-sm lg:text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
            >
              <Package className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Apps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
