import React, { useState, useEffect } from 'react';
import { Camera, Cpu, Settings, RefreshCw, Search, Check, X, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Get dynamic API base URL based on current window location
function getAPIBaseURL(): string {
  // If we have an environment variable, use it
  if ((import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }
  
  // Check if we're running in production (Docker) - use relative URLs
  if ((import.meta as any).env?.PROD) {
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

interface AppResult {
  result_name: string;
  result_data_type: string;
  result_comparison_methods: string[];
  description?: string;
}

interface SupportedApp {
  app_name: string;
  results: AppResult[];
}

interface SupportedAppsResponse {
  message?: string;
  supported_apps: SupportedApp[];
}

interface AppAssignment {
  id: string;
  created_at: string;
  updated_at: string;
  manuel_timestamp: string;
  assignment_uuid: string;
  streamer_uuid: string;
  app_name: string;
  app_config_template_name: string;
  is_active: string;
}

interface AppAssignmentsResponse {
  message?: string;
  assignments: AppAssignment[];
}

interface Camera {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  features: string[]; // Now stores app_name.result_name format
  resolution: string;
  fps: number;
  lastActivity: string;
  streamerUuid: string;
  streamerTypeUuid: string;
  configTemplateName: string;
  computeUnitIP: string;
}

interface ComputeUnit {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline';
  cameras: Camera[];
  uptime: string;
  inputs: number;
  outputs: number;
  lastActivity: string;
}

// Backend API functions for Compute Units
const loadIOUnitsFromBackend = async (): Promise<ComputeUnit[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      // Convert backend format to frontend ComputeUnit format
      return data.compute_units.map((unit: any) => ({
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ipAddress,
        status: unit.status,
        inputs: 4, // Default values
        outputs: 4,
        lastActivity: unit.lastSeen || 'Never',
        cameras: [], // Will be loaded separately
        uptime: calculateUptime(unit.lastSeen)
      }));
    }
    console.error('Failed to load compute units from backend');
    return [];
  } catch (error) {
    console.error('Failed to load Compute Units from backend:', error);
    return [];
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

// Fetch supported apps for a specific compute unit
const fetchSupportedApps = async (computeUnitIP: string): Promise<SupportedApp[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/apps/supported?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data: SupportedAppsResponse = await response.json();
      return data.supported_apps || [];
    } else {
      console.error(`Failed to fetch supported apps for ${computeUnitIP}: HTTP ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error(`Failed to fetch supported apps for ${computeUnitIP}:`, error);
    return [];
  }
};

// Convert AI streamer data to our Camera interface for Apps page
const convertAIStreamerToCameraForApps = async (aiStreamer: any, computeUnitIP: string): Promise<Camera> => {
  // Load current assignments for this streamer
  let features: string[] = [];
  try {
    const assignments = await fetchAppAssignments(computeUnitIP, aiStreamer.streamer_uuid);
    features = assignments
      .filter(assignment => assignment.is_active === 'true')
      .map(assignment => `${assignment.app_name}.${assignment.app_config_template_name}`);
  } catch (error) {
    console.error(`Failed to load assignments for streamer ${aiStreamer.streamer_uuid}:`, error);
  }

  return {
    id: aiStreamer.id.toString(),
    name: aiStreamer.streamer_hr_name,
    status: aiStreamer.is_alive === '1' || aiStreamer.is_alive === 1 ? 'active' : 'inactive',
    resolution: '1920x1080', // Default
    fps: 30, // Default
    lastActivity: aiStreamer.updated_at || 'Unknown',
    streamerUuid: aiStreamer.streamer_uuid,
    streamerTypeUuid: aiStreamer.streamer_type_uuid,
    configTemplateName: aiStreamer.config_template_name,
    computeUnitIP: aiStreamer.compute_unit_ip || 'N/A',
    features
  };
};

// Calculate uptime from last seen
const calculateUptime = (lastSeen: string): string => {
  if (!lastSeen || lastSeen === 'Never') return '-';
  
  try {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return '<1h';
    }
  } catch (error) {
    return '-';
  }
};

// Fetch app assignments for a specific streamer
const fetchAppAssignments = async (computeUnitIP: string, streamerUuid: string): Promise<AppAssignment[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/apps/assignments?compute_unit_ip=${encodeURIComponent(computeUnitIP)}&streamer_uuid=${encodeURIComponent(streamerUuid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data: AppAssignmentsResponse = await response.json();
      return data.assignments || [];
    } else {
      console.error(`Failed to fetch app assignments for ${streamerUuid}: HTTP ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error(`Failed to fetch app assignments for ${streamerUuid}:`, error);
    return [];
  }
};

// Update/Create app assignment
const updateAppAssignment = async (
  computeUnitIP: string, 
  assignment: {
    manuel_timestamp: string;
    assignment_uuid: string;
    streamer_uuid: string;
    app_name: string;
    app_config_template_name: string;
    is_active: string;
  }
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/apps/assignments/update?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to update app assignment:', error);
    return false;
  }
};

// Delete app assignment
const deleteAppAssignment = async (computeUnitIP: string, assignmentUuid: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/apps/assignments/delete?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignment_uuid: assignmentUuid }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to delete app assignment:', error);
    return false;
  }
};

export const AppsPage: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [computeUnits, setComputeUnits] = useState<ComputeUnit[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<{
    name: string;
    computeUnitIP: string;
    features: string[];
    unitId: string;
    cameraId: string;
    streamerUuid: string;
  } | null>(null);

  // Load compute units and their cameras
  const loadComputeUnitsWithCameras = async () => {
    try {
      console.log('Loading compute units and cameras for Apps page...');
      
      // Load compute units from backend
      const backendUnits = await loadIOUnitsFromBackend();
      
      // For each unit, load its cameras
      const unitsWithCameras = await Promise.all(
        backendUnits.map(async (unit) => {
          try {
            if (unit.status === 'online') {
              const cameraData = await getCamerasFromIOUnit(unit.ipAddress);
              const cameras = await Promise.all(
                cameraData.map((aiStreamer) => convertAIStreamerToCameraForApps(aiStreamer, unit.ipAddress))
              );
              return { ...unit, cameras };
            } else {
              // If unit is offline, cameras should be empty or marked as inactive
              return { ...unit, cameras: [] };
            }
          } catch (error) {
            console.error(`Failed to load cameras for unit ${unit.name}:`, error);
            return { ...unit, cameras: [] };
          }
        })
      );
      
      setComputeUnits(unitsWithCameras);
      setLastSyncTime(new Date());
      console.log('Loaded compute units with cameras:', unitsWithCameras);
    } catch (error) {
      console.error('Failed to load compute units and cameras:', error);
    }
  };

  // Polling for real-time updates (every 10 seconds) - but pause when modal is open
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        if (!loading && !modalOpen) { // Don't poll if modal is open
          console.log('🔄 Polling for Apps page updates...');
          await loadComputeUnitsWithCameras();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [loading, modalOpen]);

  // Handle page visibility changes - refresh when user comes back to the page
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Apps page became visible, refreshing data...');
        await loadComputeUnitsWithCameras();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load initial data on component mount
  useEffect(() => {
    loadComputeUnitsWithCameras();
  }, []);

  // Format last sync time for display
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  // Multi-select component for supported apps (Modal-based)
  const AppConfigurationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cameraName: string;
    computeUnitIP: string;
    streamerUuid: string;
    selectedFeatures: string[];
    onFeaturesChange: (features: string[]) => void;
  }> = ({ isOpen, onClose, cameraName, computeUnitIP, streamerUuid, selectedFeatures, onFeaturesChange }) => {
    const [supportedApps, setSupportedApps] = useState<SupportedApp[]>([]);
    const [currentAssignments, setCurrentAssignments] = useState<AppAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingChanges, setSavingChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<string>('');
    const [selectedResults, setSelectedResults] = useState<string[]>([]);
    const { theme } = useTheme();

    // Load supported apps and current assignments when modal opens
    useEffect(() => {
      if (isOpen && computeUnitIP && streamerUuid) {
        loadSupportedApps();
        loadCurrentAssignments();
      }
    }, [isOpen, computeUnitIP, streamerUuid]);

    // Reset form when modal opens
    useEffect(() => {
      if (isOpen) {
        setSelectedApp('');
        setSelectedResults([]);
        setError(null);
      }
    }, [isOpen]);

    const loadSupportedApps = async () => {
      setLoading(true);
      setError(null);
      try {
        const apps = await fetchSupportedApps(computeUnitIP);
        setSupportedApps(apps);
      } catch (error) {
        console.error('Failed to load supported apps:', error);
        setError('Failed to load supported apps');
        setSupportedApps([]);
      } finally {
        setLoading(false);
      }
    };

    const loadCurrentAssignments = async () => {
      try {
        const assignments = await fetchAppAssignments(computeUnitIP, streamerUuid);
        setCurrentAssignments(assignments);
        
        // Note: We don't call onFeaturesChange here to avoid infinite loops
        // The parent component should already have the correct features from the initial load
      } catch (error) {
        console.error('Failed to load current assignments:', error);
        setCurrentAssignments([]);
      }
    };

    const getSelectedAppObject = () => {
      return supportedApps.find(app => app.app_name === selectedApp);
    };

    const handleResultToggle = (resultName: string) => {
      setSelectedResults(prev => 
        prev.includes(resultName)
          ? prev.filter(r => r !== resultName)
          : [...prev, resultName]
      );
    };

    const handleAddFeatures = async () => {
      if (!selectedApp || selectedResults.length === 0) return;
      
      setSavingChanges(true);
      try {
        // Create assignments for each selected result
        const addPromises = selectedResults.map(async (resultName) => {
          const assignmentUuid = `${streamerUuid}_${selectedApp}_${resultName}_${Date.now()}`;
          const assignment = {
            manuel_timestamp: new Date().toISOString(),
            assignment_uuid: assignmentUuid,
            streamer_uuid: streamerUuid,
            app_name: selectedApp,
            app_config_template_name: resultName,
            is_active: 'true'
          };
          
          const success = await updateAppAssignment(computeUnitIP, assignment);
          if (!success) {
            throw new Error(`Failed to add assignment for ${selectedApp}.${resultName}`);
          }
          return assignment;
        });

        await Promise.all(addPromises);
        
        // Reload assignments to get the latest state
        await loadCurrentAssignments();
        
        // Update parent component with new features
        const updatedAssignments = await fetchAppAssignments(computeUnitIP, streamerUuid);
        const features = updatedAssignments
          .filter(assignment => assignment.is_active === 'true')
          .map(assignment => `${assignment.app_name}.${assignment.app_config_template_name}`);
        onFeaturesChange(features);
        
        // Reset form
        setSelectedApp('');
        setSelectedResults([]);
        
      } catch (error) {
        console.error('Failed to add features:', error);
        setError('Failed to add selected features. Please try again.');
      } finally {
        setSavingChanges(false);
      }
    };

    const handleRemoveFeature = async (featureToRemove: string) => {
      const [appName, resultName] = featureToRemove.split('.', 2);
      
      // Find the assignment to remove
      const assignmentToRemove = currentAssignments.find(
        assignment => assignment.app_name === appName && 
                     assignment.app_config_template_name === resultName &&
                     assignment.is_active === 'true'
      );
      
      if (!assignmentToRemove) {
        console.warn('Assignment not found for feature:', featureToRemove);
        return;
      }

      setSavingChanges(true);
      try {
        const success = await deleteAppAssignment(computeUnitIP, assignmentToRemove.assignment_uuid);
        if (!success) {
          throw new Error(`Failed to remove assignment for ${featureToRemove}`);
        }
        
        // Reload assignments to get the latest state
        await loadCurrentAssignments();
        
        // Update parent component with new features
        const updatedAssignments = await fetchAppAssignments(computeUnitIP, streamerUuid);
        const features = updatedAssignments
          .filter(assignment => assignment.is_active === 'true')
          .map(assignment => `${assignment.app_name}.${assignment.app_config_template_name}`);
        onFeaturesChange(features);
        
      } catch (error) {
        console.error('Failed to remove feature:', error);
        setError('Failed to remove feature. Please try again.');
      } finally {
        setSavingChanges(false);
      }
    };

    const canAddFeatures = selectedApp && selectedResults.length > 0 && !savingChanges;

    // Theme-based modal styles
    const modalBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
    const modalBorder = theme === 'dark' ? 'border-slate-600' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subtextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const inputBg = theme === 'dark' ? 'bg-slate-700' : 'bg-white';
    const inputBorder = theme === 'dark' ? 'border-slate-600' : 'border-gray-300';
    const hoverBg = theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-50';
    const selectedBg = theme === 'dark' ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-200';
    const checkboxBg = theme === 'dark' ? 'bg-slate-600' : 'bg-white';
    const checkboxBorder = theme === 'dark' ? 'border-slate-500' : 'border-gray-400';
    const checkboxHover = theme === 'dark' ? 'hover:border-slate-400' : 'hover:border-blue-400';
    const errorBg = theme === 'dark' ? 'bg-red-900/50' : 'bg-red-50';
    const errorBorder = theme === 'dark' ? 'border-red-700' : 'border-red-200';
    const errorText = theme === 'dark' ? 'text-red-300' : 'text-red-800';

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`relative w-full max-w-2xl mx-4 ${modalBg} rounded-lg shadow-xl border ${modalBorder} max-h-[90vh] overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 sm:p-6 border-b ${modalBorder}`}>
            <h2 className={`text-lg sm:text-xl font-semibold ${textColor} truncate pr-4`}>
              Configure Apps for {cameraName}
            </h2>
            <button
              onClick={onClose}
              className={`flex-shrink-0 p-2 rounded-lg ${hoverBg} transition-colors`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Error State */}
            {error && (
              <div className={`${errorBg} border ${errorBorder} rounded-lg p-4`}>
                <p className={`${errorText} text-sm`}>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className={`mt-2 ${errorText} hover:opacity-80 text-sm underline`}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading supported apps...</p>
              </div>
            )}

            {/* App Selection */}
            {!loading && !error && supportedApps.length > 0 && (
              <div className="space-y-6">
                {/* Step 1: Select App */}
                <div>
                  <label className={`block text-sm font-medium ${textColor} mb-2`}>
                    1. Select Application
                  </label>
                  <select
                    value={selectedApp}
                    onChange={(e) => {
                      setSelectedApp(e.target.value);
                      setSelectedResults([]);
                    }}
                    className={`w-full px-3 py-2 ${inputBg} ${textColor} border ${inputBorder} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Choose an application...</option>
                    {supportedApps.map((app) => (
                      <option key={app.app_name} value={app.app_name}>
                        {app.app_name} ({app.results.length} result{app.results.length > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Results */}
                {selectedApp && (
                  <div>
                    <label className={`block text-sm font-medium ${textColor} mb-2`}>
                      2. Select Results ({selectedResults.length} selected)
                    </label>
                    <div className={`space-y-2 max-h-60 overflow-y-auto border ${inputBorder} rounded-lg p-3`}>
                      {getSelectedAppObject()?.results.map((result) => (
                        <div
                          key={result.result_name}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedResults.includes(result.result_name) 
                              ? selectedBg
                              : `${hoverBg} border border-transparent`
                          }`}
                          onClick={() => handleResultToggle(result.result_name)}
                        >
                          <div className={`flex h-5 w-5 items-center justify-center rounded border-2 mt-0.5 transition-all ${
                            selectedResults.includes(result.result_name)
                              ? 'border-blue-500 bg-blue-500'
                              : `${checkboxBorder} ${checkboxBg} ${checkboxHover}`
                          }`}>
                            {selectedResults.includes(result.result_name) && (
                              <Check className="h-3 w-3 text-white font-bold" strokeWidth={3} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${textColor} text-sm truncate`}>
                              {result.result_name}
                            </div>
                            <div className={`text-xs ${subtextColor} mt-1 truncate`}>
                              Type: {result.result_data_type}
                            </div>
                            {result.description && (
                              <div className={`text-xs ${subtextColor} mt-1 opacity-75 line-clamp-2`}>
                                {result.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </div>
                )}

                {/* Add Button */}
                {selectedApp && selectedResults.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddFeatures}
                      disabled={!canAddFeatures || savingChanges}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingChanges ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {savingChanges ? 'Adding...' : 'Add Selected Features'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Currently Selected Features */}
            {selectedFeatures.length > 0 && (
              <div>
                <h3 className={`text-sm font-medium ${textColor} mb-3`}>
                  Currently Active Features ({selectedFeatures.length})
                </h3>
                <div className="space-y-2">
                  {selectedFeatures.map((feature) => {
                    const [appName, resultName] = feature.split('.', 2);
                    return (
                      <div
                        key={feature}
                        className={`flex items-center justify-between p-3 rounded-lg border ${inputBorder} ${hoverBg} gap-3`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`font-medium ${textColor} text-sm truncate`}>
                            {resultName || appName}
                          </div>
                          <div className={`text-xs ${subtextColor} truncate`}>
                            App: {appName}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFeature(feature)}
                          disabled={savingChanges}
                          className="flex-shrink-0 p-1 text-red-500 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingChanges ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && supportedApps.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No supported apps available for this compute unit.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex justify-end gap-3 p-4 sm:p-6 border-t ${modalBorder}`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 ${subtextColor} hover:${textColor} transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadComputeUnitsWithCameras();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return theme === 'dark' ? 'text-green-400' : 'text-green-800';
      case 'inactive':
      case 'offline':
        return 'text-muted-foreground';
      case 'error':
        return theme === 'dark' ? 'text-red-400' : 'text-red-800';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return theme === 'dark' ? 'bg-green-900/50' : 'bg-green-100';
      case 'inactive':
      case 'offline':
        return 'bg-muted';
      case 'error':
        return theme === 'dark' ? 'bg-red-900/50' : 'bg-red-100';
      default:
        return 'bg-muted';
    }
  };

  const filteredUnits = computeUnits.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.ipAddress.includes(searchTerm)
  );

  const totalCameras = computeUnits.reduce((acc, unit) => acc + unit.cameras.length, 0);
  const activeCameras = computeUnits.reduce((acc, unit) => acc + unit.cameras.filter(c => c.status === 'active').length, 0);
  const onlineUnits = computeUnits.filter(unit => unit.status === 'online').length;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            App Management
          </h1>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
              Assign different features to streamers across compute units
            </p>
            {lastSyncTime && (
              <span className="text-sm text-muted-foreground">
                • Last sync: {formatLastSync(lastSyncTime)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search compute units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{computeUnits.length}</div>
              <div className="text-sm text-muted-foreground">Compute Units</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{onlineUnits}</div>
              <div className="text-sm text-muted-foreground">Online Units</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCameras}</div>
              <div className="text-sm text-muted-foreground">Total Cameras</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{activeCameras}</div>
              <div className="text-sm text-muted-foreground">Active Cameras</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compute Units */}
      <div className="space-y-6">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-card rounded-lg border border-border">
            <div className="p-4 sm:p-6">
              {/* Unit Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <Cpu className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground truncate">{unit.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{unit.ipAddress} • Uptime: {unit.uptime}</p>
                  </div>
                </div>
                <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${getStatusBg(unit.status)} ${getStatusColor(unit.status)}`}>
                  {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                </span>
              </div>

              {/* Cameras Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {unit.cameras.map((camera) => (
                  <div key={camera.id} className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* Camera Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground text-sm truncate">{camera.name}</span>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBg(camera.status)} ${getStatusColor(camera.status)}`}>
                        {camera.status}
                      </span>
                    </div>

                    {/* Camera Info */}
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="truncate">Resolution: {camera.resolution}</div>
                      <div className="truncate">FPS: {camera.fps}</div>
                      <div className="truncate">Last Activity: {camera.lastActivity}</div>
                    </div>

                    {/* Features Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Active Features</span>
                        {camera.features.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {camera.features.length} feature{camera.features.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Active Apps - Grouped by App */}
                      <div className="space-y-3">
                        {camera.features.length > 0 ? (() => {
                          // Group features by app
                          const groupedFeatures = camera.features.reduce((acc, featureKey) => {
                            const [appName, resultName] = featureKey.split('.', 2);
                            if (!acc[appName]) {
                              acc[appName] = [];
                            }
                            acc[appName].push(resultName || appName);
                            return acc;
                          }, {} as Record<string, string[]>);

                          // App color mapping
                          const appColors = theme === 'dark' ? [
                            { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700' },
                            { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-700' },
                            { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-700' },
                            { bg: 'bg-orange-900/50', text: 'text-orange-300', border: 'border-orange-700' },
                            { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-700' },
                            { bg: 'bg-yellow-900/50', text: 'text-yellow-300', border: 'border-yellow-700' },
                            { bg: 'bg-indigo-900/50', text: 'text-indigo-300', border: 'border-indigo-700' },
                            { bg: 'bg-pink-900/50', text: 'text-pink-300', border: 'border-pink-700' },
                          ] : [
                            { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
                            { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
                            { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
                            { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
                            { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
                            { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
                            { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
                            { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
                          ];

                          return Object.entries(groupedFeatures).map(([appName, results], appIndex) => {
                            const colorScheme = appColors[appIndex % appColors.length];
                            return (
                              <div key={appName} className="space-y-2">
                                {/* App Name Header */}
                                <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md border ${colorScheme.border} bg-transparent`}>
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    theme === 'dark' 
                                      ? colorScheme.text.replace('text-', 'bg-').replace('-300', '-400')
                                      : colorScheme.text.replace('text-', 'bg-')
                                  }`}></div>
                                  <span className={`text-xs font-semibold ${colorScheme.text} truncate`}>{appName}</span>
                                  <span className={`text-xs opacity-75 ${colorScheme.text} flex-shrink-0`}>
                                    ({results.length} result{results.length > 1 ? 's' : ''})
                                  </span>
                                </div>
                                
                                {/* Results */}
                                <div className="flex flex-wrap gap-1 ml-2 sm:ml-4">
                                  {results.map((resultName) => (
                                    <span
                                      key={`${appName}.${resultName}`}
                                      className={`px-2 py-1 rounded text-xs font-medium ${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} opacity-90 truncate max-w-full`}
                                      title={`${appName}.${resultName}`}
                                    >
                                      {resultName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })() : (
                          <div className={`text-center py-4 border-2 border-dashed rounded-lg ${
                            theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                          }`}>
                            <span className="text-xs text-muted-foreground italic">No features configured</span>
                            <p className="text-xs text-muted-foreground mt-1">Click "Configure Apps" to add features</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Configure Button */}
                    <div>
                      <button
                        onClick={() => {
                          setSelectedCamera({
                            name: camera.name,
                            computeUnitIP: unit.ipAddress,
                            features: camera.features,
                            unitId: unit.id,
                            cameraId: camera.id,
                            streamerUuid: camera.streamerUuid
                          });
                          setModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="truncate">Configure Apps</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* No Cameras State */}
              {unit.cameras.length === 0 && (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No cameras found for this compute unit.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No compute units found matching your search.</p>
        </div>
      )}

      {/* App Configuration Modal */}
      {selectedCamera && (
        <AppConfigurationModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedCamera(null);
          }}
          cameraName={selectedCamera.name}
          computeUnitIP={selectedCamera.computeUnitIP}
          streamerUuid={selectedCamera.streamerUuid}
          selectedFeatures={selectedCamera.features}
          onFeaturesChange={(features: string[]) => {
            // Update the camera features in the state
            setComputeUnits(prev => prev.map(u => 
              u.id === selectedCamera.unitId 
                ? {
                    ...u,
                    cameras: u.cameras.map(c => 
                      c.id === selectedCamera.cameraId
                        ? { ...c, features }
                        : c
                    )
                  }
                : u
            ));
            
            // Update the selectedCamera state as well
            setSelectedCamera(prev => prev ? { ...prev, features } : null);
          }}
        />
      )}
    </div>
  );
};

export default AppsPage;
