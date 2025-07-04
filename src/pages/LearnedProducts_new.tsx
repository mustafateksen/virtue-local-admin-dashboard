import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2, X, Search, Filter, AlertTriangle, Brain, Eye, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

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

interface MemorySetRow {
  id: number;
  created_at: string;
  updated_at: string;
  streamer_uuid: string;
  set_uuid: string;
  tiling_method_uuid: string;
  embedding_method_uuid: string;
  number_of_samples: string;
  set_kmeans_score: string;
}

interface ThumbnailData {
  sample_uuid: string;
  jpeg_base64_str: string;
  representative_set_index: string;
}

interface MemorySet {
  id: number;
  set_uuid: string;
  created_at: string;
  updated_at: string;
  number_of_samples: string;
  set_kmeans_score: string;
  thumbnails: string[]; // Base64 decoded images
}

export const LearnedProducts: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get parameters from URL
  const streamerUuid = searchParams.get('streamerUuid') || '';
  const computeUnitIP = searchParams.get('computeUnitIP') || '';
  const streamerName = searchParams.get('streamerName') || 'Unknown Camera';
  const appName = searchParams.get('appName') || 'Unknown App';
  
  const [memorySets, setMemorySets] = useState<MemorySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSets, setFilteredSets] = useState<MemorySet[]>([]);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSetInfo, setSelectedSetInfo] = useState<MemorySet | null>(null);

  // Fetch memory set rows from backend
  const fetchMemorySets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/memory_set/rows?compute_unit_ip=${encodeURIComponent(computeUnitIP)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Memory set rows response:', data);
      
      // Filter for this specific streamer only
      const streamerMemorySets = data.memory_set_rows?.filter((row: MemorySetRow) => row.streamer_uuid === streamerUuid) || [];
      console.log(`Filtered memory sets for streamer ${streamerUuid}:`, streamerMemorySets);
      
      // Fetch thumbnails for each memory set
      const setsWithThumbnails = await Promise.all(
        streamerMemorySets.map(async (set: MemorySetRow) => {
          try {
            // Get sample UUIDs for this set (we'll use set_uuid as sample_uuid for now)
            // In real implementation, you might need another API to get sample UUIDs for a set
            const thumbnailResponse = await fetch(`${API_BASE_URL}/api/memory_set/thumbnails`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                compute_unit_ip: computeUnitIP,
                sample_uuids: [set.set_uuid] // Using set_uuid as sample_uuid for now
              }),
            });
            
            if (thumbnailResponse.ok) {
              const thumbnailData = await thumbnailResponse.json();
              console.log(`Thumbnails for set ${set.set_uuid}:`, thumbnailData);
              
              const thumbnails = thumbnailData.thumbnails?.map((thumb: ThumbnailData) => 
                `data:image/jpeg;base64,${thumb.jpeg_base64_str}`
              ) || [];
              
              return {
                id: set.id,
                set_uuid: set.set_uuid,
                created_at: set.created_at,
                updated_at: set.updated_at,
                number_of_samples: set.number_of_samples,
                set_kmeans_score: set.set_kmeans_score,
                thumbnails
              };
            } else {
              console.warn(`Failed to fetch thumbnails for set ${set.set_uuid}`);
              return {
                id: set.id,
                set_uuid: set.set_uuid,
                created_at: set.created_at,
                updated_at: set.updated_at,
                number_of_samples: set.number_of_samples,
                set_kmeans_score: set.set_kmeans_score,
                thumbnails: []
              };
            }
          } catch (err) {
            console.error(`Error fetching thumbnails for set ${set.set_uuid}:`, err);
            return {
              id: set.id,
              set_uuid: set.set_uuid,
              created_at: set.created_at,
              updated_at: set.updated_at,
              number_of_samples: set.number_of_samples,
              set_kmeans_score: set.set_kmeans_score,
              thumbnails: []
            };
          }
        })
      );
      
      setMemorySets(setsWithThumbnails);
      setFilteredSets(setsWithThumbnails);
      
    } catch (err) {
      console.error('Error fetching memory sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch memory sets');
    } finally {
      setLoading(false);
    }
  };

  // Delete memory set
  const deleteMemorySet = async (setUuid: string) => {
    if (!confirm('Are you sure you want to delete this memory set?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/memory_set/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compute_unit_ip: computeUnitIP,
          set_uuid: setUuid
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      // Remove from local state
      setMemorySets(prevSets => prevSets.filter(set => set.set_uuid !== setUuid));
      setFilteredSets(prevSets => prevSets.filter(set => set.set_uuid !== setUuid));

    } catch (err) {
      console.error('Error deleting memory set:', err);
      alert('Failed to delete memory set');
    }
  };

  // Filter memory sets based on search term
  useEffect(() => {
    let filtered = memorySets;

    if (searchTerm) {
      filtered = filtered.filter(set => 
        set.set_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.created_at.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.number_of_samples.includes(searchTerm)
      );
    }

    setFilteredSets(filtered);
  }, [memorySets, searchTerm]);

  // Load memory sets on component mount
  useEffect(() => {
    if (streamerUuid && computeUnitIP) {
      fetchMemorySets();
    } else {
      setError('Missing required parameters');
      setLoading(false);
    }
  }, [streamerUuid, computeUnitIP]);

  // Modal functions
  const handleImageClick = (images: string[], set: MemorySet, index: number = 0) => {
    setSelectedImages(images);
    setSelectedSetInfo(set);
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImages([]);
    setSelectedSetInfo(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Parse K-means score
  const parseScore = (scoreString: string) => {
    const score = parseFloat(scoreString);
    return isNaN(score) ? 0 : score;
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
            <h1 className="text-2xl font-bold text-foreground">Memory Sets</h1>
            <p className="text-muted-foreground">
              Learned patterns for <span className="font-medium">{decodeURIComponent(streamerName)}</span>
              {appName && <span className="text-muted-foreground/70"> • {decodeURIComponent(appName)}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain size={16} />
          {filteredSets.length} memory sets
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by set UUID, date, or sample count..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={fetchMemorySets}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Brain size={16} />
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
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Memory Sets</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchMemorySets}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Memory Sets Found</h3>
          <p className="text-muted-foreground">
            {memorySets.length === 0 
              ? 'This camera has no learned patterns yet.'
              : 'No memory sets match your current search.'
            }
          </p>
        </div>
      ) : (
        /* Memory Sets Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSets.map((set) => (
            <div key={set.set_uuid} className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnails Preview */}
              <div className={`aspect-square flex items-center justify-center relative overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                {set.thumbnails.length > 0 ? (
                  <div className="w-full h-full grid grid-cols-2 gap-1 p-2">
                    {set.thumbnails.slice(0, 4).map((thumbnail, index) => (
                      <img
                        key={index}
                        src={thumbnail}
                        alt={`Memory set sample ${index + 1}`}
                        className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(set.thumbnails, set, index)}
                        loading="lazy"
                      />
                    ))}
                    {/* Fill empty spaces if less than 4 images */}
                    {Array.from({ length: Math.max(0, 4 - set.thumbnails.length) }, (_, index) => (
                      <div
                        key={`empty-${index}`}
                        className={`w-full h-full rounded flex items-center justify-center ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        <Eye className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Brain className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">No thumbnails available</p>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Header with delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-purple-500" />
                    <span className="text-sm font-medium text-foreground">Memory Set</span>
                  </div>
                  <button
                    onClick={() => deleteMemorySet(set.set_uuid)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Set UUID */}
                <div>
                  <p className="text-xs text-muted-foreground">Set ID</p>
                  <p className="text-sm font-mono text-foreground truncate" title={set.set_uuid}>
                    {set.set_uuid.slice(0, 8)}...
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Samples</p>
                    <p className="text-sm font-medium text-foreground">{set.number_of_samples}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-sm font-medium text-foreground">{parseScore(set.set_kmeans_score).toFixed(2)}</p>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">{formatDate(set.created_at)}</p>
                </div>

                {/* Actions */}
                {set.thumbnails.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleImageClick(set.thumbnails, set)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      <Eye size={14} />
                      View ({set.thumbnails.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {modalOpen && selectedImages.length > 0 && selectedSetInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-4xl max-h-[90vh] p-4 w-full">
            <button
              onClick={handleCloseModal}
              className="absolute -top-2 -right-2 bg-background text-foreground rounded-full p-2 hover:bg-accent transition-colors shadow-lg z-10"
            >
              <X size={20} />
            </button>
            <div className="bg-card rounded-lg overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Memory Set Samples</h3>
                <p className="text-sm text-muted-foreground">
                  Set ID: {selectedSetInfo.set_uuid.slice(0, 16)}... • 
                  {selectedImages.length} samples • 
                  Score: {parseScore(selectedSetInfo.set_kmeans_score).toFixed(2)}
                </p>
              </div>
              
              {/* Image Display */}
              <div className="relative">
                <img
                  src={selectedImages[currentImageIndex]}
                  alt={`Memory set sample ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[60vh] object-contain mx-auto"
                />
                
                {/* Navigation */}
                {selectedImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors rotate-180"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {selectedImages.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnedProducts;
