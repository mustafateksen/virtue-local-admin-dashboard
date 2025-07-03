import React, { useState, useEffect } from 'react';
import { CircleAlert, CircleCheck, Cctv, X, Play, Square, Settings, Star } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { ManageFavoritesModal } from '../components/ManageFavoritesModal';
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

interface LastFrameResponse {
  id: string;
  created_at: string;
  updated_at: string;
  manuel_timestamp: string;
  streamer_uuid: string;
  frame_uuid: string;
  base64_jpeg: string;
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
const fetchLastFrame = async (streamerUuid: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/streamers/last_frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamer_uuid: streamerUuid
      }),
    });
    
    if (response.ok) {
      const data: LastFrameResponse = await response.json();
      if (data.base64_jpeg) {
        // Convert base64 to data URL for display
        return `data:image/jpeg;base64,${data.base64_jpeg}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch last frame for ${streamerUuid}:`, error);
    return null;
  }
};

export const MonitorPage: React.FC = () => {
  const { theme } = useTheme();
  const { favoriteStreamers } = useFavorites();
  const [learning, setLearning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [manageFavoritesOpen, setManageFavoritesOpen] = useState(false);
  const [streamerStatuses, setStreamerStatuses] = useState<Record<string, any>>({});
  const [streamerAssignments, setStreamerAssignments] = useState<Record<string, AppAssignment[]>>({});
  const [streamerFrames, setStreamerFrames] = useState<Record<string, string>>({});

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
      
      for (const streamer of favoriteStreamers) {
        // Generate mock data for demonstration
        statuses[streamer.streamerUuid] = {
          status: Math.random() > 0.7 ? 'anomaly' : 'analyzing',
          data: Array.from({ length: 10 }, () => Math.floor(Math.random() * 25) + 1),
          isAlive: streamer.isAlive === 'true'
        };
      }
      
      setStreamerStatuses(statuses);
    };

    const updateAssignments = async () => {
      const assignments: Record<string, AppAssignment[]> = {};
      
      for (const streamer of favoriteStreamers) {
        const streamerAssignments = await fetchAppAssignments(streamer.computeUnitIP, streamer.streamerUuid);
        assignments[streamer.streamerUuid] = streamerAssignments;
      }
      
      setStreamerAssignments(assignments);
    };

    const updateFrames = async () => {
      const frames: Record<string, string> = {};
      
      for (const streamer of favoriteStreamers) {
        // Only fetch frames for online streamers
        if (streamer.isAlive === 'true') {
          const frameData = await fetchLastFrame(streamer.streamerUuid);
          if (frameData) {
            frames[streamer.streamerUuid] = frameData;
          }
        }
      }
      
      setStreamerFrames(frames);
    };

    if (favoriteStreamers.length > 0) {
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
  }, [favoriteStreamers]);

  const getStreamerDisplayData = (streamer: any) => {
    const status = streamerStatuses[streamer.streamerUuid];
    const isAnomaly = status?.status === 'anomaly';
    
    return {
      ...streamer,
      status: status?.status || 'analyzing',
      data: status?.data || [5, 10, 8, 15, 12, 18, 14, 20, 16, 22],
      overlayColor: isAnomaly ? 'bg-red-600' : 'bg-green-600',
      statusBg: isAnomaly 
        ? (theme === 'dark' ? 'bg-red-950' : 'bg-red-100')
        : (theme === 'dark' ? 'bg-green-950' : 'bg-green-100'),
      statusText: isAnomaly 
        ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
        : (theme === 'dark' ? 'text-green-400' : 'text-green-600'),
    };
  };

  return (
    <div className="space-y-6 lg:space-y-8">
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
      {favoriteStreamers.length === 0 ? (
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
            className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
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
              Favorite Streamers ({favoriteStreamers.length})
              <span className="text-sm text-muted-foreground ml-2">
                ({favoriteStreamers.filter(s => s.isAlive === 'true').length} online, {favoriteStreamers.filter(s => s.isAlive !== 'true').length} offline)
              </span>
            </h2>
            <button
              onClick={() => setManageFavoritesOpen(true)}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Favorites
            </button>
          </div>

          <div className="flex flex-wrap justify-start gap-6 lg:gap-8">
            {favoriteStreamers.map((streamer) => {
              const displayData = getStreamerDisplayData(streamer);
              const isOnline = streamer.isAlive === 'true';
              
              return (
                <div key={streamer.streamerUuid} className="flex flex-col space-y-4 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.5rem)]">
                  {/* Camera Feed or Offline State */}
                  <div className="relative">
                    {isOnline ? (
                      // Online: Show camera preview
                      <>
                        <img
                          src={streamerFrames[streamer.streamerUuid] || cam1image}
                          alt={streamer.streamerHrName}
                          className="w-full aspect-square object-cover rounded-xl cursor-pointer shadow-lg"
                          onClick={() => { 
                            setModalImg(streamerFrames[streamer.streamerUuid] || cam1image); 
                            setModalOpen(true); 
                          }}
                        />
                        <div className={`absolute inset-0 rounded-xl ${displayData.overlayColor} opacity-40 pointer-events-none`} />
                        
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
                          <div className="text-sm opacity-75">Camera not available</div>
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
                      {streamer.computeUnitIP}
                    </div>
                  </div>

                  {/* Camera Info */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Cctv className="text-muted-foreground flex-shrink-0" size={18} />
                      <span className="font-medium text-foreground text-base truncate" title={streamer.streamerHrName}>
                        {streamer.streamerHrName}
                      </span>
                    </div>
                    
                    {/* App Assignment Tags */}
                    {streamerAssignments[streamer.streamerUuid] && streamerAssignments[streamer.streamerUuid].length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // Group assignments by app_name
                          const activeAssignments = streamerAssignments[streamer.streamerUuid]
                            .filter(assignment => assignment.is_active === 'true' || assignment.is_active === '1');
                          
                          const groupedApps = activeAssignments.reduce((acc, assignment) => {
                            if (!acc[assignment.app_name]) {
                              acc[assignment.app_name] = [];
                            }
                            acc[assignment.app_name].push(assignment.app_config_template_name);
                            return acc;
                          }, {} as Record<string, string[]>);

                          return Object.entries(groupedApps).map(([appName, results]) => (
                            <div key={appName} className="relative group">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                                  appName === 'ANOMALY'
                                    ? theme === 'dark'
                                      ? 'bg-red-900/50 text-red-300 border border-red-800 hover:bg-red-900/70'
                                      : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-150'
                                    : appName === 'OCR'
                                    ? theme === 'dark'
                                      ? 'bg-blue-900/50 text-blue-300 border border-blue-800 hover:bg-blue-900/70'
                                      : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-150'
                                    : appName === 'CODE-SCANNER'
                                    ? theme === 'dark'
                                      ? 'bg-green-900/50 text-green-300 border border-green-800 hover:bg-green-900/70'
                                      : 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-150'
                                    : theme === 'dark'
                                      ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
                                }`}
                              >
                                {appName}
                              </span>
                              
                              {/* Tooltip */}
                              {results.length > 0 && (
                                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap ${
                                  theme === 'dark' 
                                    ? 'bg-gray-800 text-gray-200 border border-gray-600' 
                                    : 'bg-white text-gray-800 border border-gray-200'
                                }`}
                                style={{
                                  minWidth: 'max-content',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  zIndex: 9999
                                }}>
                                  <div className="font-medium mb-1">{appName}</div>
                                  <div className="text-xs opacity-75">
                                    Results: {results.join(', ')}
                                  </div>
                                  {/* Arrow */}
                                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                                    theme === 'dark' ? 'border-t-gray-800' : 'border-t-white'
                                  }`} />
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                    
                    {isOnline ? (
                      // Online: Show anomaly/normal status
                      <span className={`${displayData.statusBg} ${displayData.statusText} rounded-lg flex items-center justify-center p-2 gap-2 text-sm font-medium transition-all duration-300 ease-in-out hover:scale-105 cursor-pointer`}>
                        {displayData.status === 'anomaly' ? <CircleAlert size={14} /> : <CircleCheck size={14} />}
                        {displayData.status === 'anomaly' ? 'Anomaly Detected' : 'Normal Operation'}
                      </span>
                    ) : (
                      // Offline: Show offline status
                      <span className={`rounded-lg flex items-center justify-center p-2 gap-2 text-sm font-medium ${
                        theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <X size={14} />
                        Camera Offline
                      </span>
                    )}
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
        onClose={() => setManageFavoritesOpen(false)}
      />
    </div>
  );
};

export default MonitorPage;
