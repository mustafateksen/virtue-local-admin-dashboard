import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Star, StarOff, Trash2, AlertTriangle, Clock, Eye, Download, Filter, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
// import { useCustomAlert } from '../hooks/useCustomAlert';
// import { CustomAlert } from '../components/CustomAlert';

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

interface AnomalyLog {
  id: number;
  created_at: string;
  updated_at: string;
  manuel_timestamp: string;
  streamer_uuid: string;
  anomaly_uuid: string;
  is_starred: string;
  // Note: file_path is deprecated - we now use anomaly_uuid for image fetching
}

interface AnomalyLogsResponse {
  anomaly_logs_metadata: AnomalyLog[];
}

export const LogsPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // const { alertState, showSuccess, showError, showConfirm, closeAlert } = useCustomAlert();
  
  // Get parameters from URL
  const streamerUuid = searchParams.get('streamerUuid') || '';
  const computeUnitIP = searchParams.get('computeUnitIP') || '';
  const streamerName = searchParams.get('streamerName') || 'Unknown Camera';
  
  const [logs, setLogs] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<AnomalyLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStarred, setFilterStarred] = useState<'all' | 'starred' | 'unstarred'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Generate image URL for anomaly log - use new base64 endpoint with anomaly_uuid
  const getImageUrl = (anomalyUuid: string) => {
    // Use backend endpoint that fetches base64 image from compute unit
    return `${API_BASE_URL}/api/anomaly_logs/image?compute_unit_ip=${encodeURIComponent(computeUnitIP)}&anomaly_uuid=${encodeURIComponent(anomalyUuid)}`;
  };

  // Handle image load error
  const handleImageError = (anomalyUuid: string) => {
    console.log('Image load error for anomaly UUID:', anomalyUuid);
    setImageErrors(prev => new Set(prev).add(anomalyUuid));
  };

  // Fetch anomaly logs metadata
  const fetchAnomalyLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/anomaly_logs/metadata?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      
      const data: AnomalyLogsResponse = await response.json();
      
      // Filter logs for this specific streamer
      const streamerLogs = data.anomaly_logs_metadata.filter(log => log.streamer_uuid === streamerUuid);
      
      // Debug: Log the anomaly logs data
      console.log('Anomaly logs data:', data);
      console.log('Streamer logs:', streamerLogs);
      streamerLogs.forEach((log, index) => {
        console.log(`Log ${index} anomaly_uuid:`, log.anomaly_uuid);
      });
      
      setLogs(streamerLogs);
      setFilteredLogs(streamerLogs);
      
    } catch (err) {
      console.error('Error fetching anomaly logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch anomaly logs');
    } finally {
      setLoading(false);
    }
  };

  // Toggle star state
  const toggleStar = async (anomalyUuid: string, currentStarred: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anomaly_logs/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compute_unit_ip: computeUnitIP,
          anomaly_uuid: anomalyUuid,
          is_starred: !currentStarred
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      // Update local state
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log.anomaly_uuid === anomalyUuid 
            ? { ...log, is_starred: !currentStarred ? '1' : '0' }
            : log
        )
      );

    } catch (err) {
      console.error('Error toggling star:', err);
      alert('Failed to update star status');
    }
  };

  // Delete anomaly log
  const deleteLog = async (anomalyUuid: string) => {
    if (!confirm('Are you sure you want to delete this anomaly log?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/anomaly_logs/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compute_unit_ip: computeUnitIP,
          anomaly_uuid: anomalyUuid
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      // Remove from local state
      setLogs(prevLogs => prevLogs.filter(log => log.anomaly_uuid !== anomalyUuid));

    } catch (err) {
      console.error('Error deleting log:', err);
      alert('Failed to delete anomaly log');
    }
  };

  // Filter logs based on search term and star filter
  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.anomaly_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.created_at.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply star filter
    if (filterStarred === 'starred') {
      filtered = filtered.filter(log => log.is_starred === '1');
    } else if (filterStarred === 'unstarred') {
      filtered = filtered.filter(log => log.is_starred === '0');
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterStarred]);

  // Load logs on component mount
  useEffect(() => {
    if (streamerUuid && computeUnitIP) {
      fetchAnomalyLogs();
    } else {
      setError('Missing required parameters');
      setLoading(false);
    }
  }, [streamerUuid, computeUnitIP]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/monitor')}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Monitor
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Anomaly Logs</h1>
            <p className="text-muted-foreground">
              Viewing anomaly logs for <span className="font-medium">{decodeURIComponent(streamerName)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle size={16} />
          {filteredLogs.length} anomalies found
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by anomaly UUID or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            value={filterStarred}
            onChange={(e) => setFilterStarred(e.target.value as 'all' | 'starred' | 'unstarred')}
            className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Logs</option>
            <option value="starred">Starred Only</option>
            <option value="unstarred">Unstarred Only</option>
          </select>
        </div>

        <button
          onClick={fetchAnomalyLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Clock size={16} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full border-2 border-t-transparent border-primary w-8 h-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Logs</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchAnomalyLogs}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Anomaly Logs Found</h3>
          <p className="text-muted-foreground">
            {logs.length === 0 
              ? 'This camera has no anomaly logs yet.'
              : 'No logs match your current filters.'
            }
          </p>
        </div>
      ) : (
        /* Logs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLogs.map((log) => (
            <div key={log.anomaly_uuid} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image */}
              <div className={`aspect-square flex items-center justify-center relative overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                {imageErrors.has(log.anomaly_uuid) ? (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Image not available</p>
                  </div>
                ) : (
                  <img
                    src={getImageUrl(log.anomaly_uuid)}
                    alt={`Anomaly ${log.anomaly_uuid}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(log.anomaly_uuid)}
                    loading="lazy"
                  />
                )}
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Header with star and delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-foreground">Anomaly</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStar(log.anomaly_uuid, log.is_starred === '1')}
                      className={`p-1 rounded transition-colors ${
                        log.is_starred === '1' 
                          ? 'text-yellow-500 hover:text-yellow-600' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {log.is_starred === '1' ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                    </button>
                    <button
                      onClick={() => deleteLog(log.anomaly_uuid)}
                      className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Anomaly UUID */}
                <div>
                  <p className="text-xs text-muted-foreground">Anomaly ID</p>
                  <p className="text-sm font-mono text-foreground truncate" title={log.anomaly_uuid}>
                    {log.anomaly_uuid.slice(0, 8)}...
                  </p>
                </div>

                {/* Date */}
                <div>
                  <p className="text-xs text-muted-foreground">Detected</p>
                  <p className="text-sm text-foreground">{formatDate(log.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedImage(log.anomaly_uuid)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    onClick={() => {
                      // Implement download functionality if needed
                      console.log('Download log:', log.anomaly_uuid);
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs border border-border rounded hover:bg-accent transition-colors"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-background text-foreground rounded-full p-2 hover:bg-accent transition-colors shadow-lg z-10"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="bg-card rounded-lg overflow-hidden">
              {imageErrors.has(selectedImage) ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                  <p className="text-muted-foreground">Image not available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Anomaly UUID: {selectedImage}
                  </p>
                </div>
              ) : (
                <img
                  src={getImageUrl(selectedImage)}
                  alt={`Anomaly ${selectedImage}`}
                  className="max-w-full max-h-[80vh] object-contain"
                  onError={() => handleImageError(selectedImage)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
