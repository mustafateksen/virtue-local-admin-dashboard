import React, { useState } from 'react';
import { Wifi, Cable, Globe, Shield, Settings, RefreshCw } from 'lucide-react';

interface NetworkInterface {
  name: string;
  type: 'wifi' | 'ethernet';
  status: 'connected' | 'disconnected' | 'limited';
  ipAddress?: string;
  gateway?: string;
  dns?: string;
  speed?: string;
}

const mockNetworkData: NetworkInterface[] = [
  {
    name: 'wlan0',
    type: 'wifi',
    status: 'connected',
    ipAddress: '192.168.1.105',
    gateway: '192.168.1.1',
    dns: '8.8.8.8',
    speed: '150 Mbps'
  },
  {
    name: 'eth0',
    type: 'ethernet',
    status: 'disconnected',
  }
];

export const NetworkPage: React.FC = () => {
  const [interfaces] = useState<NetworkInterface[]>(mockNetworkData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'limited': return 'text-yellow-600 dark:text-yellow-400';
      case 'disconnected': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 dark:bg-green-900/20';
      case 'limited': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'disconnected': return 'bg-red-100 dark:bg-red-900/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Network</h1>
          <p className="mt-2 text-base lg:text-lg text-muted-foreground">
            Network configuration and connectivity status
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-base lg:text-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Network Interfaces */}
      <div className="grid gap-4 lg:gap-6">
        {interfaces.map((iface) => (
          <div key={iface.name} className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {iface.type === 'wifi' ? (
                  <Wifi className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                ) : (
                  <Cable className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                )}
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold text-foreground">{iface.name}</h3>
                  <p className="text-sm lg:text-base text-muted-foreground capitalize">
                    {iface.type} Interface
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm lg:text-base font-medium ${getStatusBg(iface.status)} ${getStatusColor(iface.status)}`}>
                {iface.status}
              </span>
            </div>

            {iface.status === 'connected' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm lg:text-base text-muted-foreground">IP Address</p>
                  <p className="text-base lg:text-lg font-mono font-medium text-foreground">
                    {iface.ipAddress}
                  </p>
                </div>
                <div>
                  <p className="text-sm lg:text-base text-muted-foreground">Gateway</p>
                  <p className="text-base lg:text-lg font-mono font-medium text-foreground">
                    {iface.gateway}
                  </p>
                </div>
                <div>
                  <p className="text-sm lg:text-base text-muted-foreground">DNS</p>
                  <p className="text-base lg:text-lg font-mono font-medium text-foreground">
                    {iface.dns}
                  </p>
                </div>
                <div>
                  <p className="text-sm lg:text-base text-muted-foreground">Speed</p>
                  <p className="text-base lg:text-lg font-medium text-foreground">
                    {iface.speed}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm lg:text-base">
                <Settings className="w-4 h-4" />
                Configure
              </button>
              {iface.status === 'disconnected' && (
                <button className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm lg:text-base">
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Network Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            <h3 className="text-lg lg:text-xl font-semibold text-foreground">Internet Connectivity</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">Status</span>
              <span className="text-base lg:text-lg font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">Ping to 8.8.8.8</span>
              <span className="text-base lg:text-lg font-medium text-foreground">12ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">Download Speed</span>
              <span className="text-base lg:text-lg font-medium text-foreground">45.2 Mbps</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-base lg:text-lg">
              Run Speed Test
            </button>
          </div>
        </div>

        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            <h3 className="text-lg lg:text-xl font-semibold text-foreground">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">Firewall</span>
              <span className="text-base lg:text-lg font-medium text-green-600 dark:text-green-400">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">SSH Access</span>
              <span className="text-base lg:text-lg font-medium text-green-600 dark:text-green-400">
                Enabled
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base lg:text-lg text-muted-foreground">Open Ports</span>
              <span className="text-base lg:text-lg font-medium text-foreground">3</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-base lg:text-lg">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkPage;
