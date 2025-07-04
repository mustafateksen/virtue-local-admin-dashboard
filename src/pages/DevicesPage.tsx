import React, { useState } from 'react';
import { Camera, Plus, RefreshCw, CheckCircle, X, Settings, Wifi, WifiOff, Trash2, Star, StarOff, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComputeUnitStatus } from '../hooks/useComputeUnitStatus';

// Get dynamic API base URL
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

// API Functions
const addComputeUnitToBackend = async (name: string, ipAddress: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ip_address: ipAddress }),
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, message: errorData.message || 'Failed to add compute unit' };
    }
  } catch (error) {
    console.error('Failed to add compute unit:', error);
    return { success: false, message: 'Network error occurred' };
  }
};

const deleteComputeUnitFromBackend = async (unitId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units/${unitId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete compute unit:', error);
    return false;
  }
};

// Update functions
const updateComputeUnitName = async (unitId: string, newName: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units/${unitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to update compute unit name:', error);
    return false;
  }
};

const updateCameraName = async (streamerUuid: string, newName: string): Promise<boolean> => {
  try {
    console.log('🌐 Making API request to update camera name:', {
      url: `${API_BASE_URL}/api/streamers/${streamerUuid}/name`,
      payload: { name: newName }
    });
    
    const response = await fetch(`${API_BASE_URL}/api/streamers/${streamerUuid}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    
    console.log('🌐 API Response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🌐 API Error response:', errorText);
    }
    
    return response.ok;
  } catch (error) {
    console.error('🌐 Network error updating camera name:', error);
    return false;
  }
};

export const DevicesPage: React.FC = () => {
  const { theme } = useTheme();
  const { favoriteStreamers, addToFavorites, removeFromFavorites, isFavorite, removeFavoritesByComputeUnitIP } = useFavorites();
  
  // Local state for UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIP, setNewDeviceIP] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  
  // Edit state
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editingCamera, setEditingCamera] = useState<string | null>(null);
  const [editingUnitName, setEditingUnitName] = useState('');
  const [editingCameraName, setEditingCameraName] = useState('');
  
  // Use centralized hook for all compute unit and camera data
  // Disable polling when add form is open to prevent interference
  const { computeUnits, loading, lastSyncTime, error, refresh } = useComputeUnitStatus({
    componentName: 'DevicesPage',
    pollingInterval: 6000,    // Check every 6 seconds
    autoCheckInterval: 8000,  // Ping every 8 seconds
    enableAutoCheck: !showAddForm,  // Disable when add form is open
    enablePolling: !showAddForm,    // Disable when add form is open
    enableVisibilityRefresh: true,
  });

  // Format last sync time
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  // Status styling helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return theme === 'dark' ? 'text-green-400' : 'text-green-600';
      case 'offline':
      case 'inactive':
        return theme === 'dark' ? 'text-red-400' : 'text-red-600';
      default:
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return theme === 'dark' ? 'bg-green-900/50' : 'bg-green-100';
      case 'offline':
      case 'inactive':
        return theme === 'dark' ? 'bg-red-900/50' : 'bg-red-100';
      default:
        return theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return <Wifi className="w-4 h-4" />;
      case 'offline':
      case 'inactive':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  // Add new compute unit
  const handleAddDevice = async () => {
    if (!newDeviceName.trim() || !newDeviceIP.trim()) return;

    setAddingDevice(true);
    try {
      const result = await addComputeUnitToBackend(newDeviceName.trim(), newDeviceIP.trim());
      if (result.success) {
        setNewDeviceName('');
        setNewDeviceIP('');
        setShowAddForm(false); // This will re-enable polling
        // Trigger refresh to load the new device after panel closes
        setTimeout(() => refresh(), 500);
      } else {
        alert(result.message || 'Failed to add device. Please try again.');
      }
    } catch (error) {
      console.error('Error adding device:', error);
      alert('Error adding device. Please try again.');
    } finally {
      setAddingDevice(false);
    }
  };

  // Remove compute unit
  const handleRemoveDevice = async (unitId: string) => {
    if (!confirm('Are you sure you want to remove this device? This action cannot be undone.')) {
      return;
    }

    try {
      // Find the compute unit to get its IP address
      const unitToDelete = computeUnits.find(unit => unit.id === unitId);
      
      const success = await deleteComputeUnitFromBackend(unitId);
      if (success) {
        // Remove favorites associated with this compute unit's IP
        if (unitToDelete) {
          await removeFavoritesByComputeUnitIP(unitToDelete.ipAddress);
        }
        
        // Trigger immediate refresh to reflect the deletion
        await refresh();
        // Also reload the page to ensure complete state refresh
        window.location.reload();
      } else {
        alert('Failed to remove device. Please try again.');
      }
    } catch (error) {
      console.error('Error removing device:', error);
      alert('Error removing device. Please try again.');
    }
  };

  // Edit handlers
  const handleUnitNameEdit = (unitId: string, currentName: string) => {
    setEditingUnit(unitId);
    setEditingUnitName(currentName);
  };

  const handleUnitNameSave = async (unitId: string) => {
    if (editingUnitName.trim() && editingUnitName.trim() !== '') {
      const success = await updateComputeUnitName(unitId, editingUnitName.trim());
      if (success) {
        await refresh();
      } else {
        alert('Failed to update compute unit name');
      }
    }
    
    // Always clear edit state regardless of success/failure
    setEditingUnit(null);
    setEditingUnitName('');
  };

  const handleUnitNameCancel = () => {
    setEditingUnit(null);
    setEditingUnitName('');
  };

  const handleCameraNameEdit = (streamerUuid: string, currentName: string) => {
    setEditingCamera(streamerUuid);
    setEditingCameraName(currentName);
  };

  const handleCameraNameSave = async (streamerUuid: string) => {
    if (editingCameraName.trim() && editingCameraName.trim() !== '') {
      console.log('🔧 Updating camera name:', {
        streamerUuid,
        newName: editingCameraName.trim()
      });
      
      const success = await updateCameraName(streamerUuid, editingCameraName.trim());
      console.log('🔧 Update result:', success);
      
      if (success) {
        console.log('✅ Camera name updated successfully, refreshing...');
        await refresh();
      } else {
        console.error('❌ Failed to update camera name');
        alert('Failed to update camera name');
      }
    } else {
      console.log('🔧 Camera name is empty or unchanged, canceling edit');
    }
    
    // Always clear edit state regardless of success/failure
    setEditingCamera(null);
    setEditingCameraName('');
  };

  const handleCameraNameCancel = () => {
    setEditingCamera(null);
    setEditingCameraName('');
  };

  // Check if camera is favorited
  const isCameraFavorited = (cameraUuid: string) => {
    return isFavorite(cameraUuid);
  };

  // Toggle camera favorite status
  const toggleCameraFavorite = async (camera: any, computeUnitIP: string) => {
    const isFavorited = isCameraFavorited(camera.streamerUuid);
    
    if (isFavorited) {
      await removeFromFavorites(camera.streamerUuid);
    } else {
      const favoriteData = {
        id: camera.streamerUuid,
        streamerUuid: camera.streamerUuid,
        streamerHrName: camera.name,
        streamerType: 'camera',
        configTemplateName: 'default',
        computeUnitIP: computeUnitIP,
        isAlive: camera.status === 'active' ? '1' : '0',
        addedAt: new Date().toISOString(),
      };
      await addToFavorites(favoriteData);
    }
  };

  // Get all cameras from all compute units
  const allCameras = computeUnits.flatMap(unit => 
    unit.cameras.map(camera => ({
      ...camera,
      computeUnitName: unit.name,
      computeUnitStatus: unit.status,
    }))
  );

  // Loading state
  if (loading && computeUnits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-foreground">Loading devices...</p>
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
          <h2 className="text-xl font-semibold text-foreground">Failed to load devices</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">System will automatically retry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Devices</h1>
          <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Manage your compute units and camera streams
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2 inline" />}
            Last updated: {formatLastSync(lastSyncTime)}
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Add New Compute Unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Device Name</label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g., Compute Unit 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">IP Address</label>
              <input
                type="text"
                value={newDeviceIP}
                onChange={(e) => setNewDeviceIP(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g., 192.168.1.100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAddDevice}
              disabled={addingDevice || !newDeviceName.trim() || !newDeviceIP.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addingDevice ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {addingDevice ? 'Adding...' : 'Add Device'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewDeviceName('');
                setNewDeviceIP('');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Compute Units</h3>
          <p className="text-3xl font-bold text-foreground">{computeUnits.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {computeUnits.filter(u => u.status === 'online').length} online
          </p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Total Cameras</h3>
          <p className="text-3xl font-bold text-foreground">{allCameras.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {allCameras.filter(c => c.status === 'active').length} active
          </p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Favorite Cameras</h3>
          <p className="text-3xl font-bold text-foreground">{favoriteStreamers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">monitoring</p>
        </div>
        <div className="bg-card shadow rounded-lg border border-border p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground">System Health</h3>
          <p className="text-3xl font-bold text-green-600">Good</p>
          <p className="text-xs text-muted-foreground mt-1">all systems operational</p>
        </div>
      </div>

      {/* Compute Units */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Compute Units</h2>
        <div className="space-y-4">
          {computeUnits.map((unit) => (
            <div key={unit.id} className="bg-card border border-border rounded-lg p-6">
              {/* Unit Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Settings className={`w-8 h-8 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    {editingUnit === unit.id ? (
                      <input
                        type="text"
                        value={editingUnitName}
                        onChange={(e) => setEditingUnitName(e.target.value)}
                        className="text-lg font-semibold bg-background border border-border rounded px-2 py-1 text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUnitNameSave(unit.id);
                          if (e.key === 'Escape') handleUnitNameCancel();
                        }}
                        onBlur={() => handleUnitNameSave(unit.id)}
                        autoFocus
                      />
                    ) : (
                      <h3 
                        className="text-lg font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleUnitNameEdit(unit.id, unit.name)}
                        title="Click to edit name"
                      >
                        {unit.name}
                      </h3>
                    )}
                    <p className="text-sm text-muted-foreground font-mono">{unit.ipAddress}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unit.cameras.length} camera{unit.cameras.length !== 1 ? 's' : ''} 
                      {unit.cameras.length > 0 && ` (${unit.cameras.filter(c => c.status === 'active').length} active)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBg(unit.status)} ${getStatusColor(unit.status)}`}>
                    {getStatusIcon(unit.status)}
                    {unit.status}
                  </span>
                  <button 
                    onClick={() => handleRemoveDevice(unit.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full cursor-pointer transition-colors text-sm font-medium flex items-center gap-1"
                    title="Remove Compute Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>

              {/* Cameras */}
              {unit.cameras.length > 0 ? (
                <div className="border-t border-border pt-4">
                  <h4 className="text-md font-medium text-foreground mb-3">Cameras</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unit.cameras.map((camera) => {
                      const isFavorited = isCameraFavorited(camera.streamerUuid);
                      return (
                        <div key={camera.id} className="bg-secondary/50 border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Camera className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              {editingCamera === camera.streamerUuid ? (
                                <input
                                  type="text"
                                  value={editingCameraName}
                                  onChange={(e) => setEditingCameraName(e.target.value)}
                                  className="text-sm font-medium bg-background border border-border rounded px-2 py-1 text-foreground focus:ring-1 focus:ring-primary focus:border-primary flex-1 min-w-0"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCameraNameSave(camera.streamerUuid);
                                    if (e.key === 'Escape') handleCameraNameCancel();
                                  }}
                                  onBlur={() => handleCameraNameSave(camera.streamerUuid)}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="font-medium text-foreground text-sm truncate cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleCameraNameEdit(camera.streamerUuid, camera.name)}
                                  title="Click to edit name"
                                >
                                  {camera.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => toggleCameraFavorite(camera, unit.ipAddress)}
                                className={`p-1 rounded transition-colors ${
                                  isFavorited 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-muted-foreground hover:text-yellow-500'
                                }`}
                                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                {isFavorited ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                              </button>
                              <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusBg(camera.status)} ${getStatusColor(camera.status)}`}>
                                {getStatusIcon(camera.status)}
                                {camera.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>UUID: {camera.streamerUuid}</p>
                            <p>Features: {camera.features?.length || 0}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-4">
                  <div className="text-center py-4 text-muted-foreground">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {unit.status === 'online' ? 'No cameras found on this compute unit' : 'Unit is offline, cameras cannot be displayed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {computeUnits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Compute Units</h3>
              <p className="mb-4">Add your first compute unit to get started</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;
