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

// LocalStorage keys - For cameras only (Compute Units now come from backend)
const CAMERAS_STORAGE_KEY = 'virtue-devices-cameras';

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

// Update streamer name via backend API
const updateStreamerName = async (computeUnitIP: string, streamerData: Camera, newName: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/streamers/update_name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compute_unit_ip: computeUnitIP,
        streamer_uuid: streamerData.streamerUuid,
        streamer_type_uuid: streamerData.streamerTypeUuid,
        streamer_hr_name: newName,
        config_template_name: streamerData.configTemplateName,
        is_alive: streamerData.status === 'online' ? '1' : '0'
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to update streamer name:', error);
    return false;
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
      const unit = data.compute_unit;
      return {
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ipAddress,
        status: unit.status,
        inputs: 4,
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

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  const { addToFavorites, removeFromFavorites, updateFavorite, isFavorite } = useFavorites();
  
  // Cameras come from AI system and localStorage, Compute Units from backend
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [ioUnits, setIOUnits] = useState<IOUnit[]>([]);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Add/Edit Device modal states
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [addDeviceError, setAddDeviceError] = useState<string>('');
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  
  // Editing states
  const [editingStreamerId, setEditingStreamerId] = useState<string | null>(null);
  const [editingStreamerName, setEditingStreamerName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Load compute units from backend on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const backendIOUnits = await loadIOUnitsFromBackend();
        setIOUnits(backendIOUnits);
        console.log('✅ Initial compute units loaded:', backendIOUnits);
        
        // Load cameras from AI systems
        await loadCamerasFromAI(backendIOUnits);
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Save cameras to localStorage whenever they change
  useEffect(() => {
    saveCamerasToStorage(cameras);
  }, [cameras]);

  // Load cameras from AI system and update existing ones
  const loadCamerasFromAI = async (currentIOUnits?: IOUnit[]) => {
    try {
      console.log('🔍 Loading cameras from AI systems...');
      const unitsToCheck = currentIOUnits || ioUnits;
      let newCamerasFromAPI: any[] = [];
      
      // Only try to load cameras if we have IO Units
      if (unitsToCheck.length === 0) {
        console.log('❌ No IO Units found, clearing all cameras');
        setCameras([]);
        return;
      }
      
      // Get existing cameras from state/localStorage FIRST
      const existingCameras = cameras.length > 0 ? cameras : loadCamerasFromStorage();
      console.log(`📦 Found ${existingCameras.length} existing cameras in storage`);
      
      // Load cameras from each ONLINE IO Unit only
      const onlineUnits = unitsToCheck.filter(unit => unit.status === 'online');
      const offlineUnits = unitsToCheck.filter(unit => unit.status === 'offline');
      
      console.log(`🟢 ${onlineUnits.length} online units, 🔴 ${offlineUnits.length} offline units`);
      
      for (const ioUnit of onlineUnits) {
        console.log(`🔍 Checking cameras from ONLINE Compute Unit: ${ioUnit.ipAddress}`);
        try {
          const ioUnitCameras = await getCamerasFromIOUnit(ioUnit.ipAddress);
          if (ioUnitCameras && ioUnitCameras.length > 0) {
            const camerasWithIOUnit = ioUnitCameras.map(camera => ({
              ...camera,
              compute_unit_ip: ioUnit.ipAddress
            }));
            newCamerasFromAPI = [...newCamerasFromAPI, ...camerasWithIOUnit];
            console.log(`✅ Successfully loaded ${ioUnitCameras.length} cameras from ${ioUnit.ipAddress}`);
          } else {
            console.log(`⚠️ No cameras returned from ${ioUnit.ipAddress}`);
          }
        } catch (error) {
          console.error(`❌ Failed to load cameras from IO Unit ${ioUnit.ipAddress}:`, error);
        }
      }
      
      if (newCamerasFromAPI.length > 0) {
        // We got fresh data from online units - merge with existing cameras from offline units
        const freshCameras = newCamerasFromAPI.map(convertAIStreamerToCamera);
        
        // Keep existing cameras from offline units, but mark them as offline
        const existingOfflineCameras = existingCameras.filter(camera => 
          offlineUnits.some(unit => unit.ipAddress === camera.computeUnitIP)
        ).map(camera => ({
          ...camera,
          status: 'offline' as const,
          lastActivity: 'AI system unreachable'
        }));
        
        // Combine fresh cameras from online units with existing cameras from offline units
        const allCameras = [...freshCameras, ...existingOfflineCameras];
        
        setCameras(allCameras);
        console.log(`✅ Updated cameras: ${freshCameras.length} fresh + ${existingOfflineCameras.length} offline = ${allCameras.length} total`);
      } else {
        // No fresh data from API - keep existing cameras but update their status based on compute unit status
        const updatedExistingCameras = existingCameras.map(camera => {
          const correspondingIOUnit = unitsToCheck.find(unit => unit.ipAddress === camera.computeUnitIP);
          if (correspondingIOUnit) {
            if (correspondingIOUnit.status === 'offline') {
              return {
                ...camera,
                status: 'offline' as const,
                lastActivity: 'AI system unreachable'
              };
            }
          }
          return camera;
        });
        
        // Filter out cameras whose Compute Units no longer exist at all
        const filteredCameras = updatedExistingCameras.filter(camera => 
          unitsToCheck.some(unit => unit.ipAddress === camera.computeUnitIP)
        );
        
        setCameras(filteredCameras);
        console.log(`📝 Kept existing cameras with updated status: ${filteredCameras.length} cameras`);
      }
    } catch (error) {
      console.error('❌ Failed to load cameras from AI systems:', error);
    }
  };

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
      
      // Now handle cameras based on compute unit status
      await loadCamerasFromAI(updatedIOUnits);
      setLastSyncTime(new Date());
      
      console.log('✅ ===== DEVICE STATUS CHECK COMPLETED =====');
    } catch (error) {
      console.error('❌ Error in device status check:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Handle adding/removing cameras from favorites
  const handleToggleFavorite = (camera: Camera) => {
    const favoriteStreamer: FavoriteStreamer = {
      id: `${camera.computeUnitIP}-${camera.streamerUuid}`,
      streamerUuid: camera.streamerUuid,
      streamerHrName: camera.name,
      streamerType: camera.streamerTypeUuid || 'camera',
      configTemplateName: 'default',
      computeUnitIP: camera.computeUnitIP,
      isAlive: camera.status === 'online' ? 'true' : 'false',
      addedAt: new Date().toISOString()
    };

    if (isFavorite(camera.streamerUuid)) {
      removeFromFavorites(camera.streamerUuid);
    } else {
      addToFavorites(favoriteStreamer);
    }
  };

  // Handle editing streamer names
  const handleStartEditingName = (camera: Camera) => {
    setEditingStreamerId(camera.streamerUuid);
    setEditingStreamerName(camera.name);
  };

  const handleCancelEditing = () => {
    setEditingStreamerId(null);
    setEditingStreamerName('');
    setIsSavingName(false);
  };

  const handleSaveStreamerName = async (camera: Camera) => {
    if (!editingStreamerName.trim() || editingStreamerName === camera.name) {
      handleCancelEditing();
      return;
    }

    setIsSavingName(true);
    
    try {
      const success = await updateStreamerName(camera.computeUnitIP, camera, editingStreamerName.trim());
      
      if (success) {
        // Update local state
        setCameras(prev => prev.map(cam => 
          cam.streamerUuid === camera.streamerUuid 
            ? { ...cam, name: editingStreamerName.trim() }
            : cam
        ));
        
        // Update favorites context if this camera is a favorite
        if (isFavorite(camera.streamerUuid)) {
          updateFavorite(camera.streamerUuid, { 
            streamerHrName: editingStreamerName.trim() 
          });
        }
        
        console.log(`Streamer name updated: ${camera.name} -> ${editingStreamerName.trim()}`);
        handleCancelEditing();
      } else {
        console.error('Failed to update streamer name');
      }
    } catch (error) {
      console.error('Error updating streamer name:', error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, camera: Camera) => {
    if (e.key === 'Enter') {
      handleSaveStreamerName(camera);
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceIP.trim()) return;
    
    setIsAddingDevice(true);
    setAddDeviceError('');
    
    console.log('Adding Compute Unit with IP:', newDeviceIP.trim());
    
    try {
      const newIOUnit = await saveIOUnitToBackend(newDeviceIP.trim(), `Compute Unit ${ioUnits.length + 1}`);
      
      if (newIOUnit) {
        setIOUnits(prev => [...prev, newIOUnit]);
        setShowAddDevice(false);
        setNewDeviceIP('');
        setAddDeviceError('');
        
        console.log('Loading cameras from the new IO Unit...');
        setTimeout(async () => {
          await loadCamerasFromAI();
        }, 1000);
        
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
      const ioUnitToRemove = ioUnits.find(unit => unit.id === ioUnitId);
      if (ioUnitToRemove) {
        const success = await deleteIOUnitFromBackend(ioUnitId);
        
        if (success) {
          setCameras(prev => {
            const filteredCameras = prev.filter(camera => 
              camera.computeUnitIP !== ioUnitToRemove.ipAddress
            );
            console.log(`Removed cameras from Compute Unit: ${ioUnitToRemove.ipAddress}`);
            return filteredCameras;
          });
          
          setIOUnits(prev => {
            const newIOUnits = prev.filter(unit => unit.id !== ioUnitId);
            console.log('Compute Unit removed successfully, remaining units:', newIOUnits.length);
            
            if (newIOUnits.length === 0) {
              console.log('No IO Units left, clearing all cameras');
              setCameras([]);
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

  // Format last sync time for display
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString();
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
            onClick={checkAllDevicesStatus}
            disabled={isCheckingStatus}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-base lg:text-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            {isCheckingStatus ? 'Checking Status...' : 'Check Status'}
          </button>
          <button 
            onClick={() => setShowAddDevice(true)}
            className="cursor-pointer hover:scale-102 duration-300 transition-all ease-in-out flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-base lg:text-lg"
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
                    <div className="flex items-center gap-2">
                      {editingStreamerId === camera.streamerUuid ? (
                        <input
                          type="text"
                          value={editingStreamerName}
                          onChange={(e) => setEditingStreamerName(e.target.value)}
                          onBlur={() => handleSaveStreamerName(camera)}
                          onKeyDown={(e) => handleKeyDown(e, camera)}
                          className={`text-lg lg:text-xl font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 m-0 text-foreground ${
                            isSavingName ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={{ minWidth: '200px' }}
                          autoFocus
                          disabled={isSavingName}
                        />
                      ) : (
                        <>
                          <h3 className="text-lg lg:text-xl font-semibold text-foreground">{camera.name}</h3>
                          <button
                            onClick={() => handleStartEditingName(camera)}
                            className={`p-1 rounded hover:bg-accent transition-colors opacity-60 hover:opacity-100 ${
                              theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title="Edit streamer name"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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
                  <button
                    onClick={() => handleToggleFavorite(camera)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isFavorite(camera.streamerUuid)
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                        : 'border border-border hover:bg-accent'
                    }`}
                    title={isFavorite(camera.streamerUuid) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite(camera.streamerUuid) ? (
                      <Star className="w-4 h-4 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </button>
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
