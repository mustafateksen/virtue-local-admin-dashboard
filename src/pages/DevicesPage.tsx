import React, { useState, useEffect } from 'react';
import { Camera, Cpu, Plus, RefreshCw, CheckCircle, X, Settings, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Camera {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline';
  resolution: string;
  fps: number;
  lastActivity: string;
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

// API Base URL - Flask backend (configurable) 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.225:8001';

// Ping function to check device status
const pingDevice = async (ip: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ping?ip=${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return response.ok && data.status === 'reachable';
  } catch (error) {
    console.error('Ping failed for', ip, ':', error);
    return false;
  }
};

// Fetch cameras from main AI system via Flask proxy
const getCamerasFromAI = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_cameras`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.payload || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to get cameras from AI system via proxy:', error);
    return [];
  }
};

// LocalStorage keys - Only for I/O units (cameras come from AI system)
const IO_UNITS_STORAGE_KEY = 'virtue-devices-io-units';

// Helper functions for localStorage (only I/O units)
const loadIOUnitsFromStorage = (): IOUnit[] => {
  try {
    const stored = localStorage.getItem(IO_UNITS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load I/O units from storage:', error);
    return [];
  }
};

const saveIOUnitsToStorage = (ioUnits: IOUnit[]) => {
  try {
    localStorage.setItem(IO_UNITS_STORAGE_KEY, JSON.stringify(ioUnits));
  } catch (error) {
    console.error('Failed to save I/O units to storage:', error);
  }
};

// Convert AI camera data to our Camera interface
const convertAICameraToCamera = (aiCamera: any): Camera => {
  return {
    id: aiCamera.id.toString(),
    name: aiCamera.streamer_hr_name,
    ipAddress: 'N/A', // AI cameras don't have IP in the response
    status: aiCamera.is_alive === '1' ? 'online' : 'offline',
    resolution: '1920x1080', // Default
    fps: 30, // Default
    lastActivity: aiCamera.updated_at || 'Unknown'
  };
};

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  
  // Cameras come from AI system, I/O Units from localStorage
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [ioUnits, setIOUnits] = useState<IOUnit[]>(() => loadIOUnitsFromStorage());

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  // Load cameras from AI system on component mount
  useEffect(() => {
    loadCamerasFromAI();
  }, []);

  // Save I/O units to localStorage whenever they change
  useEffect(() => {
    saveIOUnitsToStorage(ioUnits);
  }, [ioUnits]);

  // Load cameras from AI system
  const loadCamerasFromAI = async () => {
    setIsLoadingCameras(true);
    try {
      console.log('Loading cameras from AI system...');
      const aiCameras = await getCamerasFromAI();
      const convertedCameras = aiCameras.map(convertAICameraToCamera);
      setCameras(convertedCameras);
      console.log('Loaded cameras:', convertedCameras);
    } catch (error) {
      console.error('Failed to load cameras from AI system:', error);
      setCameras([]);
    } finally {
      setIsLoadingCameras(false);
    }
  };

  // Check status of devices
  const checkAllDevicesStatus = async () => {
    if (isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    console.log('Checking device statuses...');
    
    try {
      // Reload cameras from AI system (they have their own status)
      await loadCamerasFromAI();
      
      // Check I/O units via ping
      const updatedIOUnits = await Promise.all(
        ioUnits.map(async (ioUnit) => {
          const isOnline = await pingDevice(ioUnit.ipAddress);
          return {
            ...ioUnit,
            status: isOnline ? 'online' as const : 'offline' as const,
            lastActivity: isOnline ? 'Just now' : ioUnit.lastActivity
          };
        })
      );
      
      setIOUnits(updatedIOUnits);
      
      console.log('Device status check completed');
    } catch (error) {
      console.error('Error checking device statuses:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Removed all useEffect hooks to test if they cause the loop
  console.log('DevicesPage render');

  // Refresh handler - reload cameras from AI and check I/O units
  const handleRefresh = async () => {
    console.log('Manual refresh triggered');
    setIsRefreshing(true);
    
    try {
      // Always check device statuses on refresh
      await checkAllDevicesStatus();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceIP.trim()) return;
    
    console.log('Adding I/O Unit with IP:', newDeviceIP.trim());
    
    // Check if device is reachable
    const isOnline = await pingDevice(newDeviceIP.trim());
    console.log('I/O Unit ping result:', isOnline);
    
    // Create a new I/O Unit (IP devices are always I/O Units)
    const newIOUnit: IOUnit = {
      id: Date.now().toString(),
      name: `I/O Unit ${ioUnits.length + 1}`,
      ipAddress: newDeviceIP.trim(),
      status: isOnline ? 'online' : 'offline',
      inputs: 8,
      outputs: 4,
      lastActivity: isOnline ? 'Just added' : 'Unreachable'
    };
    
    // Add to I/O Units array
    setIOUnits(prev => [...prev, newIOUnit]);
    
    // Close modal and reset form
    setShowAddDevice(false);
    setNewDeviceIP('');
    console.log('I/O Unit added successfully with status:', isOnline ? 'online' : 'offline');
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

  const totalDevices = cameras.length + ioUnits.length;
  const onlineDevices = cameras.filter(c => c.status === 'online').length + ioUnits.filter(io => io.status === 'online').length;

  // Tema tabanlı modal arka planı
  const modalBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const modalText = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">Device Management</h1>
          <p className="mt-2 text-base lg:text-lg text-muted-foreground">
            Manage cameras and I/O units
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isCheckingStatus}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-base lg:text-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing || isCheckingStatus ? 'animate-spin' : ''}`} />
            {isCheckingStatus ? 'Checking Status...' : 'Refresh'}
          </button>
          <button 
            onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-base lg:text-lg"
          >
            <Plus className="w-5 h-5" />
            Add I/O Unit
          </button>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${modalBg} ${modalText} border border-border rounded-lg shadow-xl p-6 w-full max-w-md`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${modalText}`}>Add New I/O Unit</h3>
              <button
                onClick={() => setShowAddDevice(false)}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${modalText} mb-2`}>
                  I/O Unit IP Address
                </label>
                <input
                  type="text"
                  value={newDeviceIP}
                  onChange={(e) => setNewDeviceIP(e.target.value)}
                  placeholder="localhost, 192.168.1.100, or 192.168.1.100:8080"
                  className={`w-full px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900'} border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                />
                <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Enter localhost, IP address, or IP with port (e.g., 192.168.1.100:8080)
                </p>
              </div>

              {/* Simplified modal - no error/success messages for now */}
              
              <div className="flex gap-2">
                <button
                  onClick={handleAddDevice}
                  disabled={!newDeviceIP.trim()}
                  className={`flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Add I/O Unit
                </button>
                <button
                  onClick={() => {
                    setShowAddDevice(false);
                    setNewDeviceIP('');
                  }}
                  className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} rounded-lg transition-colors`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Total Devices</p>
              <p className="text-2xl lg:text-3xl font-bold text-foreground">{totalDevices}</p>
            </div>
            <Cpu className="w-8 h-8 lg:w-10 lg:h-10 text-primary opacity-80" />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Online</p>
              <p className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                {onlineDevices}
              </p>
            </div>
            <CheckCircle className={`w-8 h-8 lg:w-10 lg:h-10 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">Cameras</p>
              <p className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                {cameras.length}
              </p>
            </div>
            <Camera className={`w-8 h-8 lg:w-10 lg:h-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm lg:text-base text-muted-foreground">I/O Units</p>
              <p className={`text-2xl lg:text-3xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                {ioUnits.length}
              </p>
            </div>
            <Settings className={`w-8 h-8 lg:w-10 lg:h-10 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
        </div>
      </div>

      {/* Cameras Section */}
      <div className="space-y-4">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <Camera className="w-6 h-6" />
          Cameras ({cameras.length})
        </h2>
        
        <div className="grid gap-4 lg:gap-6">
          {cameras.map((camera) => (
            <div key={camera.id} className="bg-card shadow rounded-lg border border-border p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Camera className={`w-8 h-8 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-semibold text-foreground">{camera.name}</h3>
                    <p className="text-sm lg:text-base text-muted-foreground font-mono">{camera.ipAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Resolution: {camera.resolution}</span>
                      <span>FPS: {camera.fps}</span>
                      <span>Last Activity: {camera.lastActivity}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(camera.status)} ${getStatusColor(camera.status)}`}>
                    {getStatusIcon(camera.status)}
                    {camera.status}
                  </span>
                  <button className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {cameras.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No cameras found. Add a new device to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* I/O Units Section */}
      <div className="space-y-4">
        <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6" />
          I/O Units ({ioUnits.length})
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
                  <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(ioUnit.status)} ${getStatusColor(ioUnit.status)}`}>
                    {getStatusIcon(ioUnit.status)}
                    {ioUnit.status}
                  </span>
                  <button className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {ioUnits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No I/O units found. Add a new device to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;
