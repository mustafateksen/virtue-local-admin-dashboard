import React, { useState, useEffect } from 'react';
import { Camera, Cpu, Plus, RefreshCw, CheckCircle, X, Settings, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

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
  // If we have an environment variable, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check if we're running in production (Docker) - use relative URLs
  if (import.meta.env.PROD) {
    return ''; // Use relative URLs in production (Nginx will proxy)
  }
  
  // Otherwise, construct URL based on current host (development)
  const protocol = window.location.protocol; // http: or https:
  const hostname = window.location.hostname; // Current IP or hostname
  const port = '8001'; // Backend port
  
  return `${protocol}//${hostname}:${port}`;
}

// API Base URL - Flask backend (configurable and dynamic)
const API_BASE_URL = getAPIBaseURL();

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

// Fetch cameras/streamers from a specific Compute Unit via Flask proxy
const getCamerasFromIOUnit = async (computeUnitIP: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_cameras?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`, {
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
    console.error(`Failed to get cameras from Compute Unit ${computeUnitIP}:`, error);
    return [];
  }
};

// Fetch camera statuses from a specific Compute Unit via Flask proxy
const getCameraStatusesFromIOUnit = async (computeUnitIP: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_cameras?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        compute_unit_ip: computeUnitIP,
        cameras: data.payload || []
      };
    }
    return { success: false, cameras: [] };
  } catch (error) {
    console.error(`Failed to get camera statuses from Compute Unit ${computeUnitIP}:`, error);
    return { success: false, cameras: [] };
  }
};

// LocalStorage keys - For cameras only (Compute Units now come from backend)
const CAMERAS_STORAGE_KEY = 'virtue-devices-cameras';

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
      // Convert backend format to frontend IOUnit format
      return data.compute_units.map((unit: any) => ({
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ipAddress,
        status: unit.status,
        inputs: 4, // Default values
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

const saveIOUnitToBackend = async (ipAddress: string, name?: string): Promise<IOUnit | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ip_address: ipAddress,
        name: name || `Compute Unit ${ipAddress}`
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Convert backend format to frontend IOUnit format
      const unit = data.compute_unit;
      return {
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ipAddress,
        status: unit.status,
        inputs: 4, // Default values
        outputs: 4,
        lastActivity: unit.lastSeen || 'Just added'
      };
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add compute unit');
    }
  } catch (error) {
    console.error('Failed to save Compute Unit to backend:', error);
    throw error;
  }
};

const deleteIOUnitFromBackend = async (unitId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units/${unitId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to delete Compute Unit from backend:', error);
    return false;
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

// Helper functions for localStorage (cameras) - kept for now as cameras come from AI systems
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

// Convert AI streamer data to our Camera interface
const convertAIStreamerToCamera = (aiStreamer: any): Camera => {
  return {
    id: aiStreamer.id.toString(),
    name: aiStreamer.streamer_hr_name,
    ipAddress: aiStreamer.compute_unit_ip || 'N/A', // Show Compute Unit IP
    status: aiStreamer.is_alive === '1' || aiStreamer.is_alive === 1 ? 'online' : 'offline',
    resolution: '1920x1080', // Default
    fps: 30, // Default
    lastActivity: aiStreamer.updated_at || 'Unknown',
    streamerUuid: aiStreamer.streamer_uuid,
    streamerTypeUuid: aiStreamer.streamer_type_uuid,
    configTemplateName: aiStreamer.config_template_name,
    computeUnitIP: aiStreamer.compute_unit_ip || 'N/A'
  };
};

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  
  // Cameras come from AI system and localStorage, Compute Units from backend
  // Start with empty cameras array, they will be loaded after compute units are fetched
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [ioUnits, setIOUnits] = useState<IOUnit[]>([]);

  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState<string>('');
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Polling interval for real-time sync (check every 10 seconds)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Only poll if we're not currently doing other operations
        if (!isRefreshing && !isCheckingStatus && !isAddingDevice) {
          console.log('🔄 Polling for updates...');
          
          // Load latest compute units from backend
          const latestIOUnits = await loadIOUnitsFromBackend();
          
          // Check if there are any changes
          const hasChanges = 
            latestIOUnits.length !== ioUnits.length ||
            latestIOUnits.some(unit => {
              const existing = ioUnits.find(u => u.id === unit.id);
              return !existing || 
                     existing.status !== unit.status || 
                     existing.name !== unit.name ||
                     existing.ipAddress !== unit.ipAddress;
            });
          
          if (hasChanges) {
            console.log('📱 Changes detected, updating state...');
            setIOUnits(latestIOUnits);
            
            // Also refresh cameras if compute units changed
            await loadCamerasFromAI(latestIOUnits);
            
            // Update last sync time
            setLastSyncTime(new Date());
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [ioUnits, isRefreshing, isCheckingStatus, isAddingDevice]);

  // Handle page visibility changes - refresh when user comes back to the page
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Page became visible, refreshing data...');
        try {
          const latestIOUnits = await loadIOUnitsFromBackend();
          setIOUnits(latestIOUnits);
          await loadCamerasFromAI(latestIOUnits);
          setLastSyncTime(new Date());
        } catch (error) {
          console.error('Visibility refresh error:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load compute units from backend and cameras from AI system on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load compute units from backend
        const backendIOUnits = await loadIOUnitsFromBackend();
        setIOUnits(backendIOUnits);
        
        // Always call loadCamerasFromAI to handle the camera loading logic
        // If no compute units exist, it will clear cameras
        await loadCamerasFromAI(backendIOUnits);
        
        // Set initial sync time
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array - only run on mount

  // Save cameras to localStorage whenever they change (compute units are synced with backend)
  useEffect(() => {
    saveCamerasToStorage(cameras);
  }, [cameras]);

  // Format last sync time for display
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  // Load cameras from AI system and update existing ones
  const loadCamerasFromAI = async (currentIOUnits?: IOUnit[]) => {
    try {
      console.log('Loading cameras from AI systems...');
      const unitsToCheck = currentIOUnits || ioUnits; // Use passed units or current state
      let newCamerasFromAPI: any[] = [];
      
      // Only try to load cameras if we have IO Units
      if (unitsToCheck.length === 0) {
        console.log('No IO Units found, clearing all cameras from both state and localStorage');
        setCameras([]);
        // Also clear localStorage to prevent showing old cameras
        saveCamerasToStorage([]);
        return;
      }
      
      // Load cameras from each IO Unit (both online and offline)
      for (const ioUnit of unitsToCheck) {
        console.log(`Checking cameras from Compute Unit: ${ioUnit.ipAddress} (Status: ${ioUnit.status})`);
        try {
          const ioUnitCameras = await getCamerasFromIOUnit(ioUnit.ipAddress);
          if (ioUnitCameras && ioUnitCameras.length > 0) {
            // Add Compute Unit IP to each camera for proper association
            const camerasWithIOUnit = ioUnitCameras.map(camera => ({
              ...camera,
              compute_unit_ip: ioUnit.ipAddress
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
        const convertedCameras = newCamerasFromAPI.map(convertAIStreamerToCamera);
        setCameras(convertedCameras);
        console.log('Updated cameras with fresh data from API:', convertedCameras);
      } else {
        // No fresh data from API - keep existing cameras but mark them as offline if their Compute Unit is offline
        const updatedExistingCameras = existingCameras.map(camera => {
          const correspondingIOUnit = unitsToCheck.find(unit => unit.ipAddress === camera.computeUnitIP);
          if (correspondingIOUnit && correspondingIOUnit.status === 'offline') {
            return {
              ...camera,
              status: 'offline' as const,
              lastActivity: 'AI system unreachable'
            };
          }
          return camera;
        });
        
        // Filter out cameras whose Compute Units no longer exist
        const filteredCameras = updatedExistingCameras.filter(camera => 
          unitsToCheck.some(unit => unit.ipAddress === camera.computeUnitIP)
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
      // First check Compute Units via ping
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
      
      // Update backend with new statuses
      await Promise.all(
        updatedIOUnits.map(async (ioUnit) => {
          try {
            await updateIOUnitStatusInBackend(ioUnit.id, ioUnit.status);
          } catch (error) {
            console.error(`Failed to update status for unit ${ioUnit.id}:`, error);
          }
        })
      );
      
      // Get only online IO Units for camera status checking
      const onlineIOUnits = updatedIOUnits.filter(unit => unit.status === 'online');
      const offlineIOUnits = updatedIOUnits.filter(unit => unit.status === 'offline');
      
      // Mark cameras from offline IO Units as offline
      const existingCameras = cameras.length > 0 ? cameras : loadCamerasFromStorage();
      const camerasWithOfflineUpdate = existingCameras.map(camera => {
        const isIOUnitOffline = offlineIOUnits.some(unit => unit.ipAddress === camera.computeUnitIP);
        if (isIOUnitOffline) {
          return {
            ...camera,
            status: 'offline' as const,
            lastActivity: 'AI system unreachable'
          };
        }
        return camera;
      });
      
      // Filter out cameras whose Compute Units no longer exist
      const filteredCameras = camerasWithOfflineUpdate.filter(camera => 
        updatedIOUnits.some(unit => unit.ipAddress === camera.computeUnitIP)
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
        // Find status update for this camera's Compute Unit
        const statusUpdate = statusUpdates.find(update => update.ioUnitIP === camera.computeUnitIP);
        
        if (statusUpdate && statusUpdate.cameras.length > 0) {
          // Find this specific camera in the status data
          const cameraStatus = statusUpdate.cameras.find(
            (statusCamera: any) => statusCamera.streamer_uuid === camera.streamerUuid || 
                           statusCamera.streamer_hr_name === camera.name
          );
          
          if (cameraStatus) {
            const isAlive = cameraStatus.is_alive === '1' || cameraStatus.is_alive === 1;
            return {
              ...camera,
              status: isAlive ? 'online' as const : 'offline' as const,
              lastActivity: isAlive ? 'Just now' : 'Camera offline'
            };
          }
        }
        
        // If no status found or Compute Unit is offline, mark camera as offline
        const correspondingIOUnit = onlineIOUnits.find(unit => unit.ipAddress === camera.computeUnitIP);
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

  // Debug function to log network info and API status
  const logNetworkAndApiInfo = () => {
    console.log('=== DEVICE PAGE DEBUG INFO ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Current Compute Units:', ioUnits.length);
    console.log('Current Cameras:', cameras.length);
    console.log('Camera Compute Unit mapping:');
    cameras.forEach(camera => {
      console.log(`  - ${camera.name} (${camera.streamerUuid}) -> Compute Unit: ${camera.computeUnitIP}`);
    });
    console.log('==============================');
  };

  // Log info on component mount
  useEffect(() => {
    logNetworkAndApiInfo();
  }, [cameras, ioUnits]);

  // Refresh handler - reload cameras from AI and check Compute Units
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
    
    console.log('Adding Compute Unit with IP:', newDeviceIP.trim());
    
    try {
      // Add compute unit via backend API - it will also check ping
      const newIOUnit = await saveIOUnitToBackend(newDeviceIP.trim(), `Compute Unit ${ioUnits.length + 1}`);
      
      if (newIOUnit) {
        // Add to local state
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
        
        console.log('Compute Unit added successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to add Compute Unit: ${error}`;
      setAddDeviceError(errorMsg);
      console.error(errorMsg);
    } finally {
      setIsAddingDevice(false);
    }
  };

  const handleRemoveIOUnit = async (ioUnitId: string) => {
    console.log('Removing Compute Unit with ID:', ioUnitId);
    
    try {
      // Find the IO Unit to get its IP address
      const ioUnitToRemove = ioUnits.find(unit => unit.id === ioUnitId);
      if (ioUnitToRemove) {
        // Remove from backend
        const success = await deleteIOUnitFromBackend(ioUnitId);
        
        if (success) {
          // Remove cameras that belong to this Compute Unit
          setCameras(prev => {
            const filteredCameras = prev.filter(camera => 
              camera.computeUnitIP !== ioUnitToRemove.ipAddress
            );
            console.log(`Removed cameras from Compute Unit: ${ioUnitToRemove.ipAddress}`);
            console.log('Remaining cameras after removal:', filteredCameras);
            return filteredCameras;
          });
          
          // Remove the IO Unit from local state
          setIOUnits(prev => {
            const newIOUnits = prev.filter(unit => unit.id !== ioUnitId);
            console.log('Compute Unit removed successfully, remaining units:', newIOUnits.length);
            
            // If no IO Units left, clear all cameras
            if (newIOUnits.length === 0) {
              console.log('No IO Units left, clearing all cameras from both state and localStorage');
              setCameras([]);
              // Also clear localStorage to prevent showing old cameras
              saveCamerasToStorage([]);
            }
            
            return newIOUnits;
          });
        } else {
          console.error('Failed to remove Compute Unit from backend');
        }
      }
    } catch (error) {
      console.error('Error removing Compute Unit:', error);
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
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-base lg:text-lg text-muted-foreground">
              Manage cameras and Compute Units
            </p>
            {lastSyncTime && (
              <span className="text-sm text-muted-foreground">
                • Last sync: {formatLastSync(lastSyncTime)}
              </span>
            )}
          </div>
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
            Add Compute Units
          </button>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`${modalBg} ${modalText} border border-border rounded-lg shadow-xl p-6 w-full max-w-md`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${modalText}`}>Add New Compute Units</h3>
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
                  Compute Units IP Address
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
                  {isAddingDevice ? 'Checking Device...' : 'Add Compute Units'}
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
              <p className="text-sm lg:text-base text-muted-foreground">Compute Units</p>
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
                    <p className="text-sm lg:text-base text-muted-foreground font-mono">{camera.computeUnitIP}</p>
                    <p className="text-xs text-muted-foreground">UUID: {camera.streamerUuid}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Resolution: {camera.resolution}</span>
                      <span>FPS: {camera.fps}</span>
                      <span>Last Activity: {camera.lastActivity}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBg(camera.status)} ${getStatusColor(camera.status)}`}>
                    {getStatusIcon(camera.status)}
                    {camera.status}
                  </span>
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

                  <button 
                    onClick={() => handleRemoveIOUnit(ioUnit.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full cursor-pointer transition-colors text-sm font-medium flex items-center gap-1"
                    title="Remove Compute Units"
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
              <p>No Compute Units found. Add a new device to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Last Sync Time */}
      <div className="text-sm text-muted-foreground">
        Last sync: <strong>{formatLastSync(lastSyncTime)}</strong>
      </div>
    </div>
  );
};

export default DevicesPage;
