import React, { useState, useEffect, useMemo } from 'react';
import { Cctv, X, Play, Square, Settings, Star, FileText, Brain, ScanLine, BarChart3 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComputeUnitStatus } from '../hooks/useComputeUnitStatus';
import { ManageFavoritesModal } from '../components/ManageFavoritesModal';
import { useNavigate } from 'react-router-dom';
import cam1image from '../assets/cam1.png';

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
      let filteredAssignments = data.assignments || [];
      // Filter to ensure we only get assignments for this specific streamer
      filteredAssignments = filteredAssignments.filter(assignment => assignment.streamer_uuid === streamerUuid);
      return filteredAssignments;
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch app assignments for ${streamerUuid}:`, error);
    return [];
  }
};

// Fetch last frame for a specific streamer
const fetchLastFrame = async (computeUnitIP: string, streamerUuid: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/streamers/last_frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamer_uuid: streamerUuid,
        compute_unit_ip: computeUnitIP
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`🖼️ Last frame response for ${streamerUuid}:`, data);
      
      // Handle different response formats
      if (data.base64_jpeg) {
        // Convert base64 to data URL for display
        return `data:image/jpeg;base64,${data.base64_jpeg}`;
      } else if (data.payload && data.payload.base64_jpeg) {
        return `data:image/jpeg;base64,${data.payload.base64_jpeg}`;
      }
    } else {
      console.error(`❌ HTTP Error ${response.status} fetching last frame for ${streamerUuid}`);
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch last frame for ${streamerUuid}:`, error);
    return null;
  }
};

export const MonitorPage: React.FC = () => {
  const { theme } = useTheme();
  const { favoriteStreamers, refreshFavorites } = useFavorites();
  const navigate = useNavigate();
  
  // Use centralized hook for compute unit and camera data
  const { computeUnits } = useComputeUnitStatus({
    componentName: 'MonitorPage',
    pollingInterval: 5000,
    autoCheckInterval: 8000,
    enableAutoCheck: true,
    enablePolling: true,
    enableVisibilityRefresh: true,
  });
  
  const [learning, setLearning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [manageFavoritesOpen, setManageFavoritesOpen] = useState(false);
  const [streamerStatuses, setStreamerStatuses] = useState<Record<string, any>>({});
  const [streamerAssignments, setStreamerAssignments] = useState<Record<string, AppAssignment[]>>({});
  const [streamerFrames, setStreamerFrames] = useState<Record<string, string>>({});

  // Get favorited cameras from compute units - this is our single source of truth
  // Memoize to prevent infinite re-renders
  const favoritedCameras = useMemo(() => {
    console.log(`🔍 [MonitorPage] Computing favorited cameras...`);
    console.log(`📊 [MonitorPage] Available compute units: ${computeUnits.length}`);
    console.log(`⭐ [MonitorPage] Favorite streamers: ${favoriteStreamers.length}`);
    
    const allCameras = computeUnits.flatMap(unit => {
      console.log(`🏢 [MonitorPage] Unit ${unit.name} (${unit.status}): ${unit.cameras.length} cameras`);
      
      // CRITICAL: Include ALL cameras that are marked as favorites, regardless of unit status
      const unitFavoriteCameras = unit.cameras.filter(camera => {
        const isFavorite = favoriteStreamers.some(fav => fav.streamerUuid === camera.streamerUuid);
        if (isFavorite) {
          console.log(`⭐ [MonitorPage] Found favorite camera: ${camera.name} (${camera.status}) from unit ${unit.name} (${unit.status})`);
        }
        return isFavorite;
      });
      
      return unitFavoriteCameras.map(camera => ({
        ...camera,
        computeUnitIP: unit.ipAddress,
        computeUnitName: unit.name,
        computeUnitStatus: unit.status,
        // Map to MonitorPage expected format
        streamerUuid: camera.streamerUuid,
        streamerHrName: camera.name,
        // Camera is "alive" only if both camera and unit are active/online
        isAlive: camera.status === 'active' && unit.status === 'online'
      }));
    });
    
    console.log(`📷 [MonitorPage] Final favorited cameras count: ${allCameras.length}`);
    allCameras.forEach(cam => {
      console.log(`  - ${cam.streamerHrName} (${cam.isAlive ? 'ALIVE' : 'OFFLINE'}) from ${cam.computeUnitName}`);
    });
    
    return allCameras;
  }, [computeUnits, favoriteStreamers]);

  // Mark context as loaded after a short delay to ensure it's properly initialized
  useEffect(() => {
    const timer = setTimeout(() => {
      // Context loaded - this was used for debugging
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLearningClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLearning((prev) => !prev);
      setLoading(false);
    }, 2000);
  };

  const handleStopAllClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImg(null);
  };

  // Update streamer statuses, assignments and frames periodically
  useEffect(() => {
    const updateStatuses = async () => {
      const statuses: Record<string, any> = {};
      
      for (const camera of favoritedCameras) {
        // TODO: BURASI API ILE BAĞLANACAK - Gerçek anomali durumu API'den gelecek
        statuses[camera.streamerUuid] = {
          status: 'analyzing', // Default to analyzing, will be replaced with API data
          data: Array.from({ length: 10 }, () => Math.floor(Math.random() * 25) + 1),
          isAlive: camera.isAlive
        };
      }
      
      setStreamerStatuses(statuses);
    };

    const updateAssignments = async () => {
      const assignments: Record<string, AppAssignment[]> = {};
      
      for (const camera of favoritedCameras) {
        const streamerAssignments = await fetchAppAssignments(camera.computeUnitIP, camera.streamerUuid);
        assignments[camera.streamerUuid] = streamerAssignments;
      }
      
      setStreamerAssignments(assignments);
    };

    const updateFrames = async () => {
      const frames: Record<string, string> = {};
      
      for (const camera of favoritedCameras) {
        // Try to fetch frames for all cameras, but only for those with online units
        if (camera.isAlive && camera.computeUnitStatus === 'online') {
          const frameData = await fetchLastFrame(camera.computeUnitIP, camera.streamerUuid);
          if (frameData) {
            frames[camera.streamerUuid] = frameData;
          }
        } else {
          // For offline cameras, keep any existing frame or use placeholder
          console.log(`📷 [MonitorPage] Camera ${camera.streamerHrName} is offline, keeping existing frame or using placeholder`);
        }
      }
      
      setStreamerFrames(prev => ({
        ...prev, // Keep existing frames for offline cameras
        ...frames // Update with new frames for online cameras
      }));
    };

    if (favoritedCameras.length > 0) {
      // Initial load - run immediately
      updateStatuses();
      updateAssignments();
      updateFrames();
      
      const statusInterval = setInterval(updateStatuses, 5000); // Update every 5 seconds
      const assignmentInterval = setInterval(updateAssignments, 30000); // Update every 30 seconds
      const frameInterval = setInterval(updateFrames, 8000); // Update every 8 seconds
      
      return () => {
        clearInterval(statusInterval);
        clearInterval(assignmentInterval);
        clearInterval(frameInterval);
      };
    }
  }, [favoritedCameras]);

  const getStreamerDisplayData = (streamer: any) => {
    const status = streamerStatuses[streamer.streamerUuid];
    const isAnomaly = status?.status === 'anomaly';
    const isOffline = !streamer.isAlive; // Camera or unit is offline
    
    // Debug: Log final display name - SHOULD SHOW UPDATED NAME
    console.log(`📺 FINAL DISPLAY: ${streamer.streamerUuid} = "${streamer.streamerHrName}" (isAlive: ${streamer.isAlive}, computeUnitStatus: ${streamer.computeUnitStatus})`);
    
    return {
      ...streamer,
      status: isOffline ? 'offline' : (status?.status || 'analyzing'),
      data: status?.data || [5, 10, 8, 15, 12, 18, 14, 20, 16, 22],
      overlayColor: isOffline ? 'bg-gray-600' : (isAnomaly ? 'bg-red-600' : 'bg-green-600'),
      statusBg: isOffline 
        ? (theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100')
        : (isAnomaly 
          ? (theme === 'dark' ? 'bg-red-950' : 'bg-red-100')
          : (theme === 'dark' ? 'bg-green-950' : 'bg-green-100')),
      statusText: isOffline
        ? (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
        : (isAnomaly 
          ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
          : (theme === 'dark' ? 'text-green-400' : 'text-green-600')),
    };
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute -top-4 -right-4 bg-background text-foreground rounded-full p-2 hover:bg-accent transition-colors shadow-lg z-10"
              onClick={closeModal}
            >
              <X size={20} />
            </button>
            <img
              src={modalImg ?? ''}
              alt="Camera Feed"
              className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            System Monitor
          </h1>
          <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Real-time camera streams and anomaly detection
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 min-w-[140px] h-10 border
              ${learning
                ? `${theme === 'dark' ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900' : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-50'}`
                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              }
            `}
            onClick={handleLearningClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full border-2 border-t-transparent border-current w-4 h-4" />
                Loading...
              </>
            ) : learning ? (
              <>
                <Square size={16} />
                Stop Learning
              </>
            ) : (
              <>
                <Play size={16} />
                Start Learning
              </>
            )}
          </button>
          
          <button
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-300 min-w-[140px] h-10 ${theme === 'dark' ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900' : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-50'}`}
            onClick={handleStopAllClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full border-2 border-t-transparent border-current w-4 h-4" />
                Loading...
              </>
            ) : (
              <>
                <Square size={16} />
                Stop All Actions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      {favoritedCameras.length === 0 ? (
        // Empty State - No favorites
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Cctv className="w-16 h-16 text-muted-foreground/50 mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Add Streamers to Watch
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Select your favorite streamers from the devices page to monitor them in real-time
          </p>
          <button
            onClick={() => setManageFavoritesOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Star className="w-4 h-4" />
            Manage Favorites
          </button>
        </div>
      ) : (
        // Streamers Grid
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Favorite Streamers ({favoritedCameras.length})
              <span className="text-sm text-muted-foreground ml-2">
                ({favoritedCameras.filter(camera => camera.isAlive).length} online, {favoritedCameras.filter(camera => !camera.isAlive).length} offline)
              </span>
            </h2>
            <button
              onClick={() => setManageFavoritesOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Favorites
            </button>
          </div>

          <div className="flex flex-wrap justify-start gap-6 lg:gap-8">
            {favoritedCameras.map((camera: any) => {
              const displayData = getStreamerDisplayData(camera);
              const isOnline = camera.isAlive;
              
              return (
                <div key={camera.streamerUuid} className="flex flex-col space-y-4 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.5rem)]">
                  {/* Camera Feed or Offline State */}
                  <div className="relative">
                    {isOnline ? (
                      // Online: Show camera preview
                      <>
                        <img
                          src={streamerFrames[camera.streamerUuid] || cam1image}
                          alt={displayData.streamerHrName}
                          className="w-full aspect-square object-cover rounded-xl cursor-pointer shadow-lg"
                          onClick={() => { 
                            setModalImg(streamerFrames[camera.streamerUuid] || cam1image); 
                            setModalOpen(true); 
                          }}
                        />
                        {/* Overlay for anomaly detection - only show when anomaly is detected */}
                        {displayData.status === 'anomaly' && (
                          <div className={`absolute inset-0 rounded-xl ${displayData.overlayColor} opacity-40 pointer-events-none`} />
                        )}
                        
                        {/* Live indicator */}
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-red-600 text-white">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                      </>
                    ) : (
                      // Offline: Show offline state
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <Cctv className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                        <div className="text-gray-600 dark:text-gray-400 text-center">
                          <div className="font-medium text-lg mb-1">OFFLINE</div>
                          <div className="text-sm opacity-75">
                            {camera.computeUnitStatus === 'offline' ? 'Compute Unit Offline' : 'Camera not available'}
                          </div>
                        </div>
                        
                        {/* Offline indicator */}
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-gray-600 text-gray-200">
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          OFFLINE
                        </div>
                      </div>
                    )}

                    {/* Compute Unit Badge */}
                    <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      {camera.computeUnitIP}
                    </div>
                  </div>

                  {/* Camera Info */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Cctv className="text-muted-foreground flex-shrink-0" size={18} />
                      <span className="font-medium text-foreground text-base truncate" title={displayData.streamerHrName}>
                        {displayData.streamerHrName}
                      </span>
                    </div>

                    {/* App Features Section */}
                    {(() => {
                      const hasAssignments = streamerAssignments[camera.streamerUuid] && streamerAssignments[camera.streamerUuid].length > 0;
                      const activeAssignments = hasAssignments 
                        ? streamerAssignments[camera.streamerUuid].filter(assignment => assignment.is_active === 'true' || assignment.is_active === '1')
                        : [];
                      
                      if (!hasAssignments || activeAssignments.length === 0) {
                        return (
                          <div className={`rounded-lg border p-4 text-center ${
                            theme === 'dark' ? 'bg-gray-900/30 border-gray-700' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex flex-col items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                              }`} />
                              <span className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                No apps assigned
                              </span>
                              <p className={`text-xs ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                Configure apps in the{' '}
                                <button
                                  onClick={() => navigate('/apps')}
                                  className={`underline hover:no-underline transition-all ${
                                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  Apps page
                                </button>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          {(() => {
                            const groupedApps = activeAssignments.reduce((acc, assignment) => {
                              if (!acc[assignment.app_name]) {
                                acc[assignment.app_name] = [];
                              }
                              acc[assignment.app_name].push(assignment.app_config_template_name);
                              return acc;
                            }, {} as Record<string, string[]>);

                            // Sort apps alphabetically
                            return Object.entries(groupedApps)
                              .sort(([appNameA], [appNameB]) => appNameA.localeCompare(appNameB))
                              .map(([appName]) => (
                            <div key={appName} className={`rounded-lg border p-3 ${
                              theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                            }`}>
                              {/* App Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    appName.toUpperCase().includes('ANOMALY') ? 'bg-red-500' :
                                    appName.toUpperCase().includes('OCR') ? 'bg-blue-500' :
                                    (appName.toUpperCase().includes('CODE') || appName.toUpperCase().includes('SCANNER')) ? 'bg-green-500' : 'bg-gray-500'
                                  }`} />
                                  <span className="text-sm font-medium text-foreground">
                                    {appName.toLowerCase().replace('-', '_')}
                                  </span>
                                </div>
                              </div>

                              {/* Feature Buttons */}
                              <div className="space-y-2">
                                {(() => {
                                  const buttons = [];
                                  
                                  if (appName.toUpperCase().includes('ANOMALY')) {
                                    buttons.push(
                                      <button
                                        key="logs"
                                        className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                          theme === 'dark' 
                                            ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50 hover:bg-blue-900/60 hover:border-blue-700' 
                                            : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:border-blue-400'
                                        }`}
                                        onClick={() => {
                                          console.log(`Opening logs for ${displayData.streamerHrName} - ${appName}`);
                                          navigate(`/logs?streamerUuid=${camera.streamerUuid}&computeUnitIP=${camera.computeUnitIP}&streamerName=${encodeURIComponent(displayData.streamerHrName)}`);
                                        }}
                                      >
                                        <BarChart3 className="w-4 h-4" /> View Logs
                                      </button>
                                    );
                                    buttons.push(
                                      <button
                                        key="memory"
                                        className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                          theme === 'dark' 
                                            ? 'bg-purple-900/40 text-purple-300 border border-purple-800/50 hover:bg-purple-900/60 hover:border-purple-700' 
                                            : 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 hover:border-purple-400'
                                        }`}
                                        onClick={() => navigate(`/learned-products?streamerUuid=${encodeURIComponent(camera.streamerUuid)}&computeUnitIP=${encodeURIComponent(camera.computeUnitIP)}&streamerName=${encodeURIComponent(displayData.streamerHrName)}&appName=${encodeURIComponent(appName)}`)}
                                      >
                                        <Brain className="w-4 h-4" /> View Memory
                                      </button>
                                    );
                                  }
                                  
                                  if (appName.toUpperCase().includes('OCR')) {
                                    buttons.push(
                                      <button
                                        key="text-scans"
                                        className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                          theme === 'dark' 
                                            ? 'bg-green-900/40 text-green-300 border border-green-800/50 hover:bg-green-900/60 hover:border-green-700' 
                                            : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:border-green-400'
                                        }`}
                                        onClick={() => console.log(`Opening text scans for ${displayData.streamerHrName} - ${appName}`)}
                                      >
                                        <FileText className="w-4 h-4" /> View Text Scans
                                      </button>
                                    );
                                  }
                                  
                                  if (appName.toUpperCase().includes('CODE') || appName.toUpperCase().includes('READER') || appName.toUpperCase().includes('SCANNER')) {
                                    buttons.push(
                                      <button
                                        key="scans"
                                        className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                          theme === 'dark' 
                                            ? 'bg-orange-900/40 text-orange-300 border border-orange-800/50 hover:bg-orange-900/60 hover:border-orange-700' 
                                            : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 hover:border-orange-400'
                                        }`}
                                        onClick={() => console.log(`Opening scans for ${displayData.streamerHrName} - ${appName}`)}
                                      >
                                        <ScanLine className="w-4 h-4" /> View Scans
                                      </button>
                                    );
                                  }
                                  
                                  return buttons;
                                })()}
                              </div>
                            </div>                              ));
                          })()}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manage Favorites Modal */}
      <ManageFavoritesModal 
        isOpen={manageFavoritesOpen}
        onClose={() => {
          setManageFavoritesOpen(false);
          refreshFavorites(); // Refresh favorites when the modal is closed
        }}
      />
    </div>
  );
};

export default MonitorPage;
