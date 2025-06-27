import React, { useState, useEffect } from 'react';
import { Camera, Cpu, Plus, RefreshCw, CheckCircle, X, Settings, Wifi, WifiOff, Trash2 } from 'lucide-react';
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

// Ping function to check device status - must return "pong" to be valid
const pingDevice = async (ip: string): Promise<{ reachable: boolean; response?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ping?ip=${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    
    // Only accept "pong" as a valid response - reject everything else
    const isValidPong = response.ok && data.msg === 'pong';
    
    return {
      reachable: isValidPong,
      response: `${data.msg || data.status || 'No response'} (via ${data.method || 'unknown'})`
    };
  } catch (error) {
    console.error('Ping failed for', ip, ':', error);
    return {
      reachable: false,
      response: 'Connection failed'
    };
  }
};

// Fetch cameras from a specific IO Unit via Flask proxy
const getCamerasFromIOUnit = async (ioUnitIP: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_cameras?io_unit_ip=${encodeURIComponent(ioUnitIP)}`, {
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
    console.error(`Failed to get cameras from IO Unit ${ioUnitIP}:`, error);
    return [];
  }
};

// Fetch camera statuses from a specific IO Unit via Flask proxy
const getCameraStatusesFromIOUnit = async (ioUnitIP: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_streamer_statuses?io_unit_ip=${encodeURIComponent(ioUnitIP)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { success: false, cameras: [] };
  } catch (error) {
    console.error(`Failed to get camera statuses from IO Unit ${ioUnitIP}:`, error);
    return { success: false, cameras: [] };
  }
};

// LocalStorage keys - For both I/O units and cameras
const IO_UNITS_STORAGE_KEY = 'virtue-devices-io-units';
const CAMERAS_STORAGE_KEY = 'virtue-devices-cameras';

// Helper functions for localStorage (I/O units)
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
    // Dispatch custom event to notify other components (like DashboardPage)
    window.dispatchEvent(new CustomEvent('ioUnitsUpdated'));
  } catch (error) {
    console.error('Failed to save I/O units to storage:', error);
  }
};

// Helper functions for localStorage (cameras)
const loadCamerasFromStorage = (): Camera[] => {
  try {
    const stored = localStorage.getItem(CAMERAS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load cameras from storage:', error);
    return [];
  }
};

const saveCamerasToStorage = (cameras: Camera[]) => {
  try {
    localStorage.setItem(CAMERAS_STORAGE_KEY, JSON.stringify(cameras));
  } catch (error) {
    console.error('Failed to save cameras to storage:', error);
  }
};

// Convert AI camera data to our Camera interface
const convertAICameraToCamera = (aiCamera: any): Camera => {
  return {
    id: aiCamera.id.toString(),
    name: aiCamera.streamer_hr_name,
    ipAddress: aiCamera.io_unit_ip || 'N/A', // Show IO Unit IP
    status: aiCamera.is_alive === '1' ? 'online' : 'offline',
    resolution: '1920x1080', // Default
    fps: 30, // Default
    lastActivity: aiCamera.updated_at || 'Unknown'
  };
};

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  
  // Cameras come from AI system AND localStorage, I/O Units from localStorage
  const [cameras, setCameras] = useState<Camera[]>(() => loadCamerasFromStorage());
  const [ioUnits, setIOUnits] = useState<IOUnit[]>(() => loadIOUnitsFromStorage());

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState<string>('');
  const [isAddingDevice, setIsAddingDevice] = useState(false);

  // Load cameras from AI system on component mount only
  useEffect(() => {
    // Only load on initial mount, not when ioUnits change
    if (ioUnits.length > 0) {
      loadCamerasFromAI();
    }
  }, []); // Empty dependency array - only run on mount

  // Save I/O units to localStorage whenever they change
  useEffect(() => {
    saveIOUnitsToStorage(ioUnits);
  }, [ioUnits]);

  // Save cameras to localStorage whenever they change
  useEffect(() => {
    saveCamerasToStorage(cameras);
  }, [cameras]);

  // Load cameras from AI system and update existing ones
  const loadCamerasFromAI = async (currentIOUnits?: IOUnit[]) => {
    try {
      console.log('Loading cameras from AI systems...');
      const unitsToCheck = currentIOUnits || ioUnits; // Use passed units or current state
      let newCamerasFromAPI: any[] = [];
      
      // Only try to load cameras if we have IO Units
      if (unitsToCheck.length === 0) {
        console.log('No IO Units found, clearing all cameras');
        setCameras([]);
        return;
      }
      
      // Load cameras from each IO Unit (both online and offline)
      for (const ioUnit of unitsToCheck) {
        console.log(`Checking cameras from IO Unit: ${ioUnit.ipAddress} (Status: ${ioUnit.status})`);
        try {
          const ioUnitCameras = await getCamerasFromIOUnit(ioUnit.ipAddress);
          if (ioUnitCameras && ioUnitCameras.length > 0) {
            // Add IO Unit IP to each camera for proper association
            const camerasWithIOUnit = ioUnitCameras.map(camera => ({
              ...camera,
              io_unit_ip: ioUnit.ipAddress
            }));
            newCamerasFromAPI = [...newCamerasFromAPI, ...camerasWithIOUnit];
            console.log(`Successfully loaded ${ioUnitCameras.length} cameras from ${ioUnit.ipAddress}`);
          } else {
            console.log(`No cameras returned from ${ioUnit.ipAddress} (may be offline)`);
          }
        } catch (error) {
          console.error(`Failed to load cameras from IO Unit ${ioUnit.ipAddress}:`, error);
        }
      }
      
      // Get existing cameras from state/localStorage
      const existingCameras = cameras.length > 0 ? cameras : loadCamerasFromStorage();
      
      if (newCamerasFromAPI.length > 0) {
        // We got fresh data from API - update cameras
        const convertedCameras = newCamerasFromAPI.map(convertAICameraToCamera);
        setCameras(convertedCameras);
        console.log('Updated cameras with fresh data from API:', convertedCameras);
      } else {
        // No fresh data from API - keep existing cameras but mark them as offline if their IO Unit is offline
        const updatedExistingCameras = existingCameras.map(camera => {
          const correspondingIOUnit = unitsToCheck.find(unit => unit.ipAddress === camera.ipAddress);
          if (correspondingIOUnit && correspondingIOUnit.status === 'offline') {
            return {
              ...camera,
              status: 'offline' as const,
              lastActivity: 'AI system unreachable'
            };
          }
          return camera;
        });
        
        // Filter out cameras whose IO Units no longer exist
        const filteredCameras = updatedExistingCameras.filter(camera => 
          unitsToCheck.some(unit => unit.ipAddress === camera.ipAddress)
        );
        
        setCameras(filteredCameras);
        console.log('Kept existing cameras with updated offline status:', filteredCameras);
      }
    } catch (error) {
      console.error('Failed to load cameras from AI systems:', error);
      // Don't clear cameras on error - keep existing ones
    }
  };

  // Check status of devices
  const checkAllDevicesStatus = async () => {
    if (isCheckingStatus) return;
    
    setIsCheckingStatus(true);
    console.log('Checking device statuses...');
    
    try {
      // First check I/O units via ping
      const updatedIOUnits = await Promise.all(
        ioUnits.map(async (ioUnit) => {
          const pingResult = await pingDevice(ioUnit.ipAddress);
          return {
            ...ioUnit,
            status: pingResult.reachable ? 'online' as const : 'offline' as const,
            lastActivity: pingResult.reachable ? 'Just now' : ioUnit.lastActivity
          };
        })
      );
      
      setIOUnits(updatedIOUnits);
      
      // Get only online IO Units for camera status checking
      const onlineIOUnits = updatedIOUnits.filter(unit => unit.status === 'online');
      const offlineIOUnits = updatedIOUnits.filter(unit => unit.status === 'offline');
      
      // Mark cameras from offline IO Units as offline
      const existingCameras = cameras.length > 0 ? cameras : loadCamerasFromStorage();
      const camerasWithOfflineUpdate = existingCameras.map(camera => {
        const isIOUnitOffline = offlineIOUnits.some(unit => unit.ipAddress === camera.ipAddress);
        if (isIOUnitOffline) {
          return {
            ...camera,
            status: 'offline' as const,
            lastActivity: 'AI system unreachable'
          };
        }
        return camera;
      });
      
      // Filter out cameras whose IO Units no longer exist
      const filteredCameras = camerasWithOfflineUpdate.filter(camera => 
        updatedIOUnits.some(unit => unit.ipAddress === camera.ipAddress)
      );
      
      setCameras(filteredCameras);
      console.log('Updated camera statuses based on IO unit status:', filteredCameras);
      
      // If there are online IO Units, update camera statuses using /get-streamers
      if (onlineIOUnits.length > 0) {
        console.log(`Updating camera statuses for ${onlineIOUnits.length} online IO Units...`);
        await updateCameraStatuses(onlineIOUnits);
      } else {
        console.log('No online IO Units found, skipping camera status update');
      }
      
      // Also try to get fresh camera data from online IO units
      await loadCamerasFromAI(updatedIOUnits);
      
      console.log('Device status check completed');
    } catch (error) {
      console.error('Error checking device statuses:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Update camera statuses for online IO Units using /get-streamers
  const updateCameraStatuses = async (onlineIOUnits: IOUnit[]) => {
    try {
      console.log('Updating camera statuses for online IO Units...');
      
      // Get current cameras
      const currentCameras = cameras.length > 0 ? cameras : loadCamerasFromStorage();
      
      if (currentCameras.length === 0) {
        console.log('No cameras to update');
        return;
      }
      
      // For each online IO Unit, get camera statuses from /get-streamers
      const statusUpdates = await Promise.all(
        onlineIOUnits.map(async (ioUnit) => {
          try {
            const statusData = await getCameraStatusesFromIOUnit(ioUnit.ipAddress);
            if (statusData.success && statusData.cameras) {
              return {
                ioUnitIP: ioUnit.ipAddress,
                cameras: statusData.cameras
              };
            }
          } catch (error) {
            console.error(`Failed to get camera statuses from ${ioUnit.ipAddress}:`, error);
          }
          return { ioUnitIP: ioUnit.ipAddress, cameras: [] };
        })
      );
      
      // Update camera statuses based on the fetched data
      const updatedCameras = currentCameras.map(camera => {
        // Find status update for this camera's IO Unit
        const statusUpdate = statusUpdates.find(update => update.ioUnitIP === camera.ipAddress);
        
        if (statusUpdate && statusUpdate.cameras.length > 0) {
          // Find this specific camera in the status data
          const cameraStatus = statusUpdate.cameras.find(
            (statusCamera: any) => statusCamera.streamer_uuid === camera.id || 
                           statusCamera.streamer_hr_name === camera.name
          );
          
          if (cameraStatus) {
            const isAlive = cameraStatus.is_alive === 'true' || cameraStatus.is_alive === true;
            return {
              ...camera,
              status: isAlive ? 'online' as const : 'offline' as const,
              lastActivity: isAlive ? 'Just now' : 'Camera offline'
            };
          }
        }
        
        // If no status found or IO Unit is offline, mark camera as offline
        const correspondingIOUnit = onlineIOUnits.find(unit => unit.ipAddress === camera.ipAddress);
        if (!correspondingIOUnit) {
          return {
            ...camera,
            status: 'offline' as const,
            lastActivity: 'AI system unreachable'
          };
        }
        
        return camera;
      });
      
      setCameras(updatedCameras);
      console.log('Camera statuses updated based on /get-streamers data:', updatedCameras);
      
    } catch (error) {
      console.error('Error updating camera statuses:', error);
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
    
    setIsAddingDevice(true);
    setAddDeviceError('');
    
    console.log('Adding I/O Unit with IP:', newDeviceIP.trim());
    
    try {
      // Check if device is reachable and responds with "pong"
      const pingResult = await pingDevice(newDeviceIP.trim());
      console.log('I/O Unit ping result:', pingResult);
      
      if (!pingResult.reachable) {
        // Device didn't respond with "pong" - show error and don't add
        const errorMsg = `Device not found at ${newDeviceIP.trim()}.\n\nError: ${pingResult.response}`;
        setAddDeviceError(errorMsg);
        console.error(errorMsg);
        return;
      }
      
      // Device is valid - create and add the I/O Unit
      const newIOUnit: IOUnit = {
        id: Date.now().toString(),
        name: `I/O Unit ${ioUnits.length + 1}`,
        ipAddress: newDeviceIP.trim(),
        status: 'online', // We know it's online because ping succeeded
        inputs: 8,
        outputs: 4,
        lastActivity: 'Just added'
      };
      
      // Add to I/O Units array
      setIOUnits(prev => [...prev, newIOUnit]);
      
      // Close modal and reset form
      setShowAddDevice(false);
      setNewDeviceIP('');
      setAddDeviceError('');
      
      // Load cameras from this new IO Unit
      console.log('Loading cameras from the new IO Unit...');
      setTimeout(async () => {
        await loadCamerasFromAI();
      }, 1000); // Small delay to ensure state updates
      
      console.log('I/O Unit added successfully');
    } catch (error) {
      const errorMsg = `Failed to add I/O Unit: ${error}`;
      setAddDeviceError(errorMsg);
      console.error(errorMsg);
    } finally {
      setIsAddingDevice(false);
    }
  };

  const handleRemoveIOUnit = (ioUnitId: string) => {
    console.log('Removing I/O Unit with ID:', ioUnitId);
    
    // Find the IO Unit to get its IP address
    const ioUnitToRemove = ioUnits.find(unit => unit.id === ioUnitId);
    if (ioUnitToRemove) {
      // Remove cameras that belong to this IO Unit
      // The camera's ipAddress field contains the IO Unit IP (from io_unit_ip)
      setCameras(prev => {
        const filteredCameras = prev.filter(camera => 
          camera.ipAddress !== ioUnitToRemove.ipAddress
        );
        console.log(`Removed cameras from IO Unit: ${ioUnitToRemove.ipAddress}`);
        console.log('Remaining cameras after removal:', filteredCameras);
        return filteredCameras;
      });
    }
    
    // Remove the IO Unit itself
    setIOUnits(prev => {
      const newIOUnits = prev.filter(unit => unit.id !== ioUnitId);
      console.log('I/O Unit removed successfully, remaining units:', newIOUnits.length);
      
      // If no IO Units left, clear all cameras
      if (newIOUnits.length === 0) {
        console.log('No IO Units left, clearing all cameras');
        setCameras([]);
      }
      
      return newIOUnits;
    });
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

              {/* Error message */}
              {addDeviceError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-800 whitespace-pre-line">{addDeviceError}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleAddDevice}
                  disabled={!newDeviceIP.trim() || isAddingDevice}
                  className={`flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isAddingDevice ? 'Checking Device...' : 'Add I/O Unit'}
                </button>
                <button
                  onClick={() => {
                    setShowAddDevice(false);
                    setNewDeviceIP('');
                    setAddDeviceError('');
                  }}
                  disabled={isAddingDevice}
                  className={`px-4 py-2 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} rounded-lg transition-colors disabled:opacity-50`}
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
                  <button 
                    onClick={() => handleRemoveIOUnit(ioUnit.id)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm flex items-center gap-1"
                    title="Remove I/O Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
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
