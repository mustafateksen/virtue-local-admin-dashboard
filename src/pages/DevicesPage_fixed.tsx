import React, { useState, useEffect } from 'react';
import { Camera, Cpu, Plus, RefreshCw, CheckCircle, X, Settings, Wifi, WifiOff, Trash2, Star, StarOff, Edit3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import type { FavoriteStreamer } from '../contexts/FavoritesContext';

interface Camera {
  id: string;
  name: string;
  ipAddress: string; // This will be the Compute Unit IP
  status: 'online' | 'offline';
  resolution: string;
  fps: number;
  lastActivity: string;
  streamerUuid: string;
  streamerTypeUuid: string;
  configTemplateName: string;
  computeUnitIP: string; // Which compute unit this camera belongs to
}

interface IOUnit {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline';
  inputs: number;
  outputs: number;
  lastActivity: string;
}

// Get dynamic API base URL based on current window location
function getAPIBaseURL(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (import.meta.env.PROD) {
    return '';
  }
  
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '8001';
  
  return `${protocol}//${hostname}:${port}`;
}

const API_BASE_URL = getAPIBaseURL();

// Ping function to check device status - must return "pong" to be valid
const pingDevice = async (ip: string): Promise<{ reachable: boolean; response?: string }> => {
  try {
    console.log(`🔍 Pinging device: ${ip}`);
    const response = await fetch(`${API_BASE_URL}/api/ping?ip=${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    
    console.log(`📡 Ping response for ${ip}:`, data);
    
    // Only accept "pong" as a valid response - reject everything else
    const isValidPong = response.ok && data.msg === 'pong';
    
    console.log(`✅ Device ${ip} reachable: ${isValidPong} (msg: ${data.msg})`);
    
    return {
      reachable: isValidPong,
      response: `${data.msg || data.status || 'No response'} (via ${data.method || 'unknown'})`
    };
  } catch (error) {
    console.error(`❌ Ping failed for ${ip}:`, error);
    return {
      reachable: false,
      response: 'Connection failed'
    };
  }
};

// Backend API functions for Compute Units
const loadIOUnitsFromBackend = async (): Promise<IOUnit[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.compute_units.map((unit: any) => ({
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ipAddress,
        status: unit.status,
        inputs: 4,
        outputs: 4,
        lastActivity: unit.lastSeen || 'Never'
      }));
    }
    console.error('Failed to load compute units from backend');
    return [];
  } catch (error) {
    console.error('Failed to load Compute Units from backend:', error);
    return [];
  }
};

const updateIOUnitStatusInBackend = async (unitId: string, status: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units/${unitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to update Compute Unit status in backend:', error);
    return false;
  }
};

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  const [ioUnits, setIOUnits] = useState<IOUnit[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Load compute units from backend on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const backendIOUnits = await loadIOUnitsFromBackend();
        setIOUnits(backendIOUnits);
        console.log('✅ Initial compute units loaded:', backendIOUnits);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Check status of devices
  const checkAllDevicesStatus = async () => {
    if (isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    console.log('🔍 ===== STARTING DEVICE STATUS CHECK =====');
    
    try {
      console.log(`📋 Checking ${ioUnits.length} compute units...`);
      const updatedIOUnits = await Promise.all(
        ioUnits.map(async (ioUnit) => {
          console.log(`🔍 [${ioUnit.name}] Checking: ${ioUnit.ipAddress} (Current status: ${ioUnit.status})`);
          const pingResult = await pingDevice(ioUnit.ipAddress);
          const newStatus = pingResult.reachable ? 'online' as const : 'offline' as const;
          
          if (ioUnit.status !== newStatus) {
            console.log(`🔄 [${ioUnit.name}] Status change: ${ioUnit.status} -> ${newStatus}`);
          } else {
            console.log(`✅ [${ioUnit.name}] Status unchanged: ${newStatus}`);
          }
          
          return {
            ...ioUnit,
            status: newStatus,
            lastActivity: pingResult.reachable ? 'Just now' : ioUnit.lastActivity
          };
        })
      );
      
      console.log('💾 Updating compute units state...');
      setIOUnits(updatedIOUnits);
      
      // Update backend with new statuses
      console.log('🔄 Updating backend with new statuses...');
      const backendUpdateResults = await Promise.all(
        updatedIOUnits.map(async (ioUnit) => {
          try {
            console.log(`💾 [${ioUnit.name}] Updating backend status: ${ioUnit.status}`);
            const success = await updateIOUnitStatusInBackend(ioUnit.id, ioUnit.status);
            console.log(`${success ? '✅' : '❌'} [${ioUnit.name}] Backend update: ${success ? 'SUCCESS' : 'FAILED'}`);
            return { unit: ioUnit, success };
          } catch (error) {
            console.error(`❌ [${ioUnit.name}] Backend update error:`, error);
            return { unit: ioUnit, success: false };
          }
        })
      );
      
      // Log backend update summary
      const successCount = backendUpdateResults.filter(r => r.success).length;
      console.log(`📊 Backend updates: ${successCount}/${backendUpdateResults.length} successful`);
      
      console.log('✅ ===== DEVICE STATUS CHECK COMPLETED =====');
    } catch (error) {
      console.error('❌ Error in device status check:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      case 'offline': return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': return theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100';
      case 'offline': return theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="w-4 h-4" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Device Management</h1>
          <p className="text-base lg:text-lg text-muted-foreground">
            Manage cameras and Compute Units
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={checkAllDevicesStatus}
            disabled={isCheckingStatus}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-base lg:text-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            {isCheckingStatus ? 'Checking Status...' : 'Check Status'}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Compute Units</p>
              <p className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                {ioUnits.length}
              </p>
            </div>
            <Settings className={`w-8 h-8 lg:w-10 lg:h-10 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
        </div>
      </div>

      {/* Compute Units Section */}
      <div className="space-y-4">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Compute Units ({ioUnits.length})
        </h2>
        
        <div className="grid gap-4 lg:gap-6">
          {ioUnits.map((ioUnit) => (
            <div key={ioUnit.id} className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Settings className={`w-8 h-8 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-foreground">{ioUnit.name}</h3>
                    <p className="text-sm lg:text-base text-muted-foreground font-mono">{ioUnit.ipAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Inputs: {ioUnit.inputs}</span>
                      <span>Outputs: {ioUnit.outputs}</span>
                      <span>Last Activity: {ioUnit.lastActivity}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBg(ioUnit.status)} ${getStatusColor(ioUnit.status)}`}>
                    {getStatusIcon(ioUnit.status)}
                    {ioUnit.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {ioUnits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No Compute Units found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;
