import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, HardDrive, Cpu, Activity, Server, Settings, ArrowRight, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useComputeUnitStatus } from '../hooks/useComputeUnitStatus';

export const DashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // Use the centralized hook for consistent data across all pages
  const { computeUnits, loading, lastSyncTime, error } = useComputeUnitStatus({
    componentName: 'Dashboard',
    pollingInterval: 6000,    // Check every 6 seconds
    autoCheckInterval: 8000,  // Ping every 8 seconds
    enableAutoCheck: true,
    enablePolling: true,
    enableVisibilityRefresh: true,
  });

  // Calculate stats from the unified data
  const totalCameras = computeUnits.reduce((sum, unit) => sum + (unit.cameras?.length || 0), 0);
  const activeCameras = computeUnits.reduce((sum, unit) =>
    sum + (unit.cameras?.filter(c => c.status === 'active').length || 0), 0);
  const onlineUnits = computeUnits.filter(unit => unit.status === 'online').length;

  // Format last sync time
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  // Loading state
  if (loading && computeUnits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-foreground">Loading system status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Failed to load dashboard</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">System will automatically retry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Overview of your Main Terminal Cluster and System status
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-4 sm:mt-0">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />}
            Last updated: {formatLastSync(lastSyncTime)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Compute Units</h3>
          <p className="text-3xl font-bold text-foreground">{computeUnits.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{onlineUnits} online</p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Online Units</h3>
          <p className="text-3xl font-bold text-foreground">{onlineUnits}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((onlineUnits / Math.max(computeUnits.length, 1)) * 100).toFixed(0)}% uptime
          </p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Cameras</h3>
          <p className="text-3xl font-bold text-foreground">{totalCameras}</p>
          <p className="text-xs text-muted-foreground mt-1">{activeCameras} active</p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Active Cameras</h3>
          <p className="text-3xl font-bold text-foreground">{activeCameras}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {((activeCameras / Math.max(totalCameras, 1)) * 100).toFixed(0)}% active
          </p>
        </div>
      </div>

      {/* System Information Grid */}
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
          <div className="px-6 py-6 sm:p-8 h-full flex flex-col">
            <h3 className="text-xl lg:text-2xl xl:text-3xl leading-6 font-bold text-foreground mb-6">
              Compute Units
            </h3>
            <div className="space-y-4 flex-1">
              {computeUnits.length === 0 ? (
                <div className="flex items-center justify-center p-6 text-center h-full min-h-[200px]">
                  <div>
                    <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm lg:text-base text-muted-foreground">
                      No Compute Units found
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add devices in the Devices page to see them here
                    </p>
                  </div>
                </div>
              ) : (
                computeUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between p-4 lg:p-5 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm lg:text-base font-medium text-foreground truncate">{unit.name}</p>
                      <p className="text-sm text-muted-foreground">{unit.ipAddress}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {unit.cameras.length} camera{unit.cameras.length !== 1 ? 's' : ''} 
                        {unit.cameras.length > 0 && ` (${unit.cameras.filter(c => c.status === 'active').length} active)`}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base font-semibold rounded-full ${
                        unit.status === 'online' 
                          ? theme === 'dark' ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-800'
                          : theme === 'dark' ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-800'
                      }`}>
                        {unit.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {unit.lastSeen ? new Date(unit.lastSeen).toLocaleTimeString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* See All Button - Always at bottom right */}
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
              <span>Monitor Streamers</span>
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
            <button 
              onClick={() => navigate('/settings')}
              className="cursor-pointer flex items-center justify-center px-6 py-4 lg:px-8 lg:py-6 border border-border rounded-lg shadow-sm bg-card text-sm lg:text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
            >
              <Settings className="h-6 w-6 lg:h-7 lg:w-7 mr-3" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
