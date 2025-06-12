import React, { useState } from 'react';
import { Cpu, HardDrive, Thermometer, Zap, Plus, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface RaspberryDevice {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number;
  uptime: string;
  lastSeen: string;
}

const mockDevices: RaspberryDevice[] = [
  {
    id: '1',
    name: 'RaspberryPi-Main',
    ipAddress: '192.168.1.100',
    status: 'online',
    cpuUsage: 45,
    memoryUsage: 67,
    diskUsage: 34,
    temperature: 52,
    uptime: '7d 14h 32m',
    lastSeen: 'Just now'
  },
  {
    id: '2',
    name: 'RaspberryPi-Sensor',
    ipAddress: '192.168.1.101',
    status: 'warning',
    cpuUsage: 78,
    memoryUsage: 89,
    diskUsage: 91,
    temperature: 67,
    uptime: '2d 8h 15m',
    lastSeen: '2 minutes ago'
  },
  {
    id: '3',
    name: 'RaspberryPi-Camera',
    ipAddress: '192.168.1.102',
    status: 'offline',
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    temperature: 0,
    uptime: '0m',
    lastSeen: '1 hour ago'
  }
];

export const DevicesPage: React.FC = () => {
  const [devices] = useState<RaspberryDevice[]>(mockDevices);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'offline': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 dark:bg-green-900/20';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'offline': return 'bg-red-100 dark:bg-red-900/20';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'offline': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Raspberry Devices</h1>
          <p className="mt-2 text-base lg:text-lg text-muted-foreground">
            Manage connected Raspberry Pi devices
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-base lg:text-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-base lg:text-lg">
            <Plus className="w-5 h-5" />
            Add Device
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Total Devices</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{devices.length}</p>
            </div>
            <Cpu className="w-8 h-8 lg:w-10 lg:h-10 text-primary opacity-80" />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Online</p>
              <p className="text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                {devices.filter(d => d.status === 'online').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Warnings</p>
              <p className="text-2xl lg:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {devices.filter(d => d.status === 'warning').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 lg:w-10 lg:h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Offline</p>
              <p className="text-2xl lg:text-3xl font-bold text-red-600 dark:text-red-400">
                {devices.filter(d => d.status === 'offline').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 lg:w-10 lg:h-10 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="grid gap-4 lg:gap-6">
        {devices.map((device) => (
          <div key={device.id} className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
            {/* Device Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg lg:text-xl font-semibold text-foreground">{device.name}</h3>
                <p className="text-sm lg:text-base text-muted-foreground font-mono">{device.ipAddress}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm lg:text-base font-medium ${getStatusBg(device.status)} ${getStatusColor(device.status)}`}>
                  {getStatusIcon(device.status)}
                  {device.status}
                </span>
              </div>
            </div>

            {device.status !== 'offline' && (
              <>
                {/* System Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm lg:text-base text-muted-foreground flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        CPU
                      </span>
                      <span className="text-sm lg:text-base font-medium text-foreground">{device.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(device.cpuUsage)}`}
                        style={{ width: `${device.cpuUsage}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm lg:text-base text-muted-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Memory
                      </span>
                      <span className="text-sm lg:text-base font-medium text-foreground">{device.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(device.memoryUsage)}`}
                        style={{ width: `${device.memoryUsage}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm lg:text-base text-muted-foreground flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        Disk
                      </span>
                      <span className="text-sm lg:text-base font-medium text-foreground">{device.diskUsage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getUsageColor(device.diskUsage)}`}
                        style={{ width: `${device.diskUsage}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm lg:text-base text-muted-foreground flex items-center gap-2">
                        <Thermometer className="w-4 h-4" />
                        Temp
                      </span>
                      <span className="text-sm lg:text-base font-medium text-foreground">{device.temperature}°C</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${device.temperature > 60 ? 'bg-red-500' : device.temperature > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(device.temperature, 80)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm lg:text-base">
                  <div>
                    <span className="text-muted-foreground">Uptime: </span>
                    <span className="font-medium text-foreground">{device.uptime}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Seen: </span>
                    <span className="font-medium text-foreground">{device.lastSeen}</span>
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              <button className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm lg:text-base">
                View Details
              </button>
              <button className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm lg:text-base">
                Configure
              </button>
              {device.status === 'offline' ? (
                <button className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm lg:text-base">
                  Reconnect
                </button>
              ) : (
                <button className="px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors text-sm lg:text-base">
                  Reboot
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DevicesPage;
