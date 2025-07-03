import React, { useState, useEffect } from 'react';
import { X, Camera, Star, StarOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import type { FavoriteStreamer } from '../contexts/FavoritesContext';

interface ComputeUnit {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline';
}

interface StreamerData {
  streamer_uuid: string;
  streamer_hr_name: string;
  streamer_type: string;
  config_template_name: string;
  is_alive: string | number | boolean;
  compute_unit_ip?: string;
  ip_address?: string;
}

interface ManageFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
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

// Helper function to determine if a streamer is alive
const isStreamerAlive = (streamer: StreamerData): boolean => {
  return streamer.is_alive === 'true' || streamer.is_alive === '1' || streamer.is_alive === 1 || streamer.is_alive === true;
};

export const ManageFavoritesModal: React.FC<ManageFavoritesModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { favoriteStreamers, addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  
  const [computeUnits, setComputeUnits] = useState<ComputeUnit[]>([]);
  const [streamers, setStreamers] = useState<StreamerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load compute units from backend
  const loadComputeUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setComputeUnits(data.compute_units.map((unit: any) => ({
          id: unit.id,
          name: unit.name,
          ipAddress: unit.ipAddress,
          status: unit.status
        })));
      }
    } catch (error) {
      console.error('Failed to load compute units:', error);
      setError('Failed to load compute units');
    }
  };

  // Load streamers from all compute units
  const loadStreamers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allStreamers: StreamerData[] = [];
      
      for (const unit of computeUnits) {
        // Load from all compute units, regardless of their status
        try {
          const response = await fetch(`${API_BASE_URL}/get_cameras?compute_unit_ip=${encodeURIComponent(unit.ipAddress)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const unitStreamers = (data.payload || []).map((streamer: any) => ({
              ...streamer,
              compute_unit_ip: unit.ipAddress,
              // Normalize is_alive to consistent format  
              is_alive: (streamer.is_alive === '1' || streamer.is_alive === 1 || streamer.is_alive === 'true' || streamer.is_alive === true) ? 'true' : 'false'
            }));
            allStreamers.push(...unitStreamers);
            console.log(`Loaded ${unitStreamers.length} streamers from ${unit.ipAddress}:`, unitStreamers);
          }
        } catch (error) {
          console.error(`Failed to load streamers from ${unit.ipAddress}:`, error);
          // Continue with other units even if one fails
        }
      }
      
      setStreamers(allStreamers);
    } catch (error) {
      console.error('Failed to load streamers:', error);
      setError('Failed to load streamers');
    } finally {
      setLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadComputeUnits();
    }
  }, [isOpen]);

  // Load streamers when compute units are loaded
  useEffect(() => {
    if (computeUnits.length > 0) {
      loadStreamers();
    }
  }, [computeUnits]);

  const handleToggleFavorite = (streamer: StreamerData) => {
    // The full streamer object is now the favorite
    const favoriteStreamer: FavoriteStreamer = {
        id: streamer.streamer_uuid, // Use uuid as the primary id
        streamerUuid: streamer.streamer_uuid,
        streamerHrName: streamer.streamer_hr_name || 'Unknown Camera',
        streamerType: streamer.streamer_type || 'camera',
        configTemplateName: streamer.config_template_name || 'default',
        computeUnitIP: streamer.compute_unit_ip || 'N/A',
        isAlive: isStreamerAlive(streamer) ? 'true' : 'false',
        ipAddress: streamer.ip_address,
        addedAt: new Date().toISOString(),
    };

    if (isFavorite(streamer.streamer_uuid)) {
      removeFromFavorites(streamer.streamer_uuid);
    } else {
      addToFavorites(favoriteStreamer);
    }
  };

  const refresh = () => {
    loadComputeUnits();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Manage Favorite Streamers</h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Select streamers to monitor in the Monitor page
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={loading}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                theme === 'dark' 
                  ? 'border-gray-700 hover:bg-gray-800 text-gray-300' 
                  : 'border-gray-200 hover:bg-gray-100 text-gray-700'
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                theme === 'dark' 
                  ? 'border-gray-700 hover:bg-gray-800 text-gray-300' 
                  : 'border-gray-200 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {error && (
            <div className={`p-4 rounded-lg mb-4 ${
              theme === 'dark' 
                ? 'bg-red-900/50 text-red-400 border border-red-800' 
                : 'bg-red-100 text-red-600 border border-red-200'
            }`}>
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full border-2 border-t-transparent w-6 h-6 mr-2 ${
                theme === 'dark' ? 'border-blue-400' : 'border-blue-600'
              }`} />
              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Loading streamers...</span>
            </div>
          )}

          {!loading && streamers.length === 0 && (
            <div className="text-center py-8">
              <Camera className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No streamers found</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                Make sure you have online compute units with cameras
              </p>
            </div>
          )}

          {!loading && streamers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Found {streamers.length} streamers • {favoriteStreamers.length} favorites selected
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {streamers.map((streamer) => (
                  <div
                    key={`${streamer.compute_unit_ip}-${streamer.streamer_uuid}`}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      isFavorite(streamer.streamer_uuid)
                        ? theme === 'dark'
                          ? 'border-blue-600 bg-blue-900/20'
                          : 'border-blue-500 bg-blue-50'
                        : theme === 'dark'
                          ? 'border-gray-700 hover:border-gray-600'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                          <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {streamer.streamer_hr_name}
                          </h3>
                          {isStreamerAlive(streamer) ? (
                            <Wifi className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className={`space-y-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          <p>Type: {streamer.streamer_type}</p>
                          <p>Template: {streamer.config_template_name}</p>
                          <p>Compute Unit: {streamer.compute_unit_ip}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFavorite(streamer)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          isFavorite(streamer.streamer_uuid)
                            ? theme === 'dark'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                            : theme === 'dark'
                              ? 'border border-gray-700 hover:bg-gray-800 text-gray-300'
                              : 'border border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                        title={isFavorite(streamer.streamer_uuid) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite(streamer.streamer_uuid) ? (
                          <Star className="w-4 h-4 fill-current" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {favoriteStreamers.length} streamer{favoriteStreamers.length !== 1 ? 's' : ''} selected for monitoring
          </p>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
