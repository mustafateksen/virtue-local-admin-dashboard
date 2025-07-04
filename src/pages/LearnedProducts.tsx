import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2, X, Search, AlertTriangle, Brain, Eye, Calendar , RefreshCw} from 'lucide-react';
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
  thumbnails: ThumbnailData[];
  thumbnailImages: string[];
  previewThumbnails: string[]; // First 4 thumbnails for preview
  allSampleUuids: string[]; // All sample UUIDs for lazy loading
  loadingThumbnails?: boolean;
}

export const LearnedProducts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  
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
      
      // Check different possible response structures
      let rawMemorySets = [];
      if (data.payload) {
        rawMemorySets = data.payload;
      } else if (data.memory_set_rows) {
        rawMemorySets = data.memory_set_rows;
      } else if (Array.isArray(data)) {
        rawMemorySets = data;
      } else {
        console.warn('Unexpected response structure:', data);
        rawMemorySets = [];
      }
      
      // Filter for this specific streamer only
      const streamerMemorySets = rawMemorySets.filter((row: MemorySetRow) => row.streamer_uuid === streamerUuid);
      console.log(`Filtered memory sets for streamer ${streamerUuid}:`, streamerMemorySets);
      
      // Create memory sets and load preview thumbnails
      const setsWithoutThumbnails = streamerMemorySets.map((set: MemorySetRow) => ({
        id: set.id,
        set_uuid: set.set_uuid,
        created_at: set.created_at,
        updated_at: set.updated_at,
        number_of_samples: set.number_of_samples,
        set_kmeans_score: set.set_kmeans_score,
        thumbnails: [],
        thumbnailImages: [],
        previewThumbnails: [],
        allSampleUuids: [],
        loadingThumbnails: false
      }));
      
      setMemorySets(setsWithoutThumbnails);
      setFilteredSets(setsWithoutThumbnails);

      // Load preview thumbnails (first 4) for each set
      await loadPreviewThumbnails(setsWithoutThumbnails);
      
    } catch (err) {
      console.error('Error fetching memory sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch memory sets');
    } finally {
      setLoading(false);
    }
  };

  // Load preview thumbnails (first 4) for all sets
  const loadPreviewThumbnails = async (sets: MemorySet[]) => {
    for (const set of sets) {
      try {
        // Get all sample UUIDs for this set
        const sampleUuids = await fetchSampleUUIDs(set.set_uuid);
        
        if (sampleUuids.length === 0) {
          continue;
        }

        // Get first 4 sample UUIDs for preview
        const previewSampleUuids = sampleUuids.slice(0, 4);
        
        // Fetch preview thumbnails
        const previewThumbnails = await fetchThumbnailsForSamples(previewSampleUuids);
        const previewImages = previewThumbnails.map(thumb => `data:image/jpeg;base64,${thumb.jpeg_base64_str}`);
        
        // Update the set with preview thumbnails and all sample UUIDs
        setMemorySets(prevSets => 
          prevSets.map(prevSet => 
            prevSet.set_uuid === set.set_uuid 
              ? { 
                  ...prevSet, 
                  previewThumbnails: previewImages,
                  allSampleUuids: sampleUuids,
                  thumbnailImages: previewImages // Start with preview images
                }
              : prevSet
          )
        );
        
        setFilteredSets(prevSets => 
          prevSets.map(prevSet => 
            prevSet.set_uuid === set.set_uuid 
              ? { 
                  ...prevSet, 
                  previewThumbnails: previewImages,
                  allSampleUuids: sampleUuids,
                  thumbnailImages: previewImages // Start with preview images
                }
              : prevSet
          )
        );
      } catch (err) {
        console.error(`Error loading preview thumbnails for set ${set.set_uuid}:`, err);
      }
    }
  };

  // Fetch sample UUIDs for a specific memory set
  const fetchSampleUUIDs = async (setUuid: string): Promise<string[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory_set/samples?compute_unit_ip=${encodeURIComponent(computeUnitIP)}&set_uuid=${encodeURIComponent(setUuid)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Sample UUIDs for set ${setUuid}:`, data);
        
        // Extract sample UUIDs from response
        if (data.sample_uuids && Array.isArray(data.sample_uuids)) {
          return data.sample_uuids;
        } else if (data.payload && Array.isArray(data.payload)) {
          return data.payload;
        } else if (Array.isArray(data)) {
          return data;
        } else {
          console.warn(`Unexpected sample UUIDs response structure for set ${setUuid}:`, data);
          return [];
        }
      } else {
        console.warn(`Failed to fetch sample UUIDs for set ${setUuid}: ${response.status}`);
        return [];
      }
    } catch (err) {
      console.error(`Error fetching sample UUIDs for set ${setUuid}:`, err);
      return [];
    }
  };

  // Fetch thumbnails for specific sample UUIDs
  const fetchThumbnailsForSamples = async (sampleUuids: string[]): Promise<ThumbnailData[]> => {
    try {
      if (sampleUuids.length === 0) {
        return [];
      }

      const thumbnailResponse = await fetch(`${API_BASE_URL}/api/memory_set/thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compute_unit_ip: computeUnitIP,
          sample_uuids: sampleUuids
        }),
      });
      
      if (thumbnailResponse.ok) {
        const thumbnailData = await thumbnailResponse.json();
        console.log(`Thumbnails for samples:`, thumbnailData);
        return thumbnailData.thumbnails || [];
      } else {
        console.warn(`Failed to fetch thumbnails for samples`);
        return [];
      }
    } catch (err) {
      console.error(`Error fetching thumbnails for samples:`, err);
      return [];
    }
  };

  // Load thumbnails lazily when navigating through modal
  const loadThumbnailAtIndex = async (setInfo: MemorySet, index: number) => {
    if (index < setInfo.thumbnailImages.length) {
      return; // Already loaded
    }

    try {
      const sampleUuid = setInfo.allSampleUuids[index];
      if (!sampleUuid) return;

      const thumbnails = await fetchThumbnailsForSamples([sampleUuid]);
      if (thumbnails.length > 0) {
        const thumbnailImage = `data:image/jpeg;base64,${thumbnails[0].jpeg_base64_str}`;
        
        // Update the specific set with the new thumbnail
        const updatedImages = [...setInfo.thumbnailImages];
        updatedImages[index] = thumbnailImage;
        
        setMemorySets(prevSets => 
          prevSets.map(set => 
            set.set_uuid === setInfo.set_uuid 
              ? { ...set, thumbnailImages: updatedImages }
              : set
          )
        );
        
        setFilteredSets(prevSets => 
          prevSets.map(set => 
            set.set_uuid === setInfo.set_uuid 
              ? { ...set, thumbnailImages: updatedImages }
              : set
          )
        );

        // Update selected images in modal
        setSelectedImages(updatedImages);
      }
    } catch (err) {
      console.error(`Error loading thumbnail at index ${index}:`, err);
    }
  };

  // Open modal with thumbnails
  const openThumbnailModal = (memorySet: MemorySet, startIndex: number = 0) => {
    if (memorySet.thumbnailImages.length === 0) {
      return; // No thumbnails to show
    }
    
    setSelectedImages(memorySet.thumbnailImages);
    setSelectedSetInfo(memorySet);
    setCurrentImageIndex(startIndex);
    setModalOpen(true);
  };

  // Navigate to next/previous image in modal
  const navigateModal = (direction: 'next' | 'prev') => {
    if (!selectedSetInfo) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentImageIndex < selectedSetInfo.allSampleUuids.length - 1 
        ? currentImageIndex + 1 
        : 0;
    } else {
      newIndex = currentImageIndex > 0 
        ? currentImageIndex - 1 
        : selectedSetInfo.allSampleUuids.length - 1;
    }

    setCurrentImageIndex(newIndex);
    
    // Load thumbnail if not already loaded
    loadThumbnailAtIndex(selectedSetInfo, newIndex);
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
  const handleViewThumbnails = (set: MemorySet, startIndex: number = 0) => {
    openThumbnailModal(set, startIndex);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImages([]);
    setSelectedSetInfo(null);
    setCurrentImageIndex(0);
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const nextImage = () => {
    navigateModal('next');
  };

  const prevImage = () => {
    navigateModal('prev');
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
          <RefreshCw size={16} />
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
        /* Memory Sets Table */
        <div className="bg-card shadow rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Set ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Samples</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Thumbnails</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSets.map((set) => (
                  <tr 
                    key={set.set_uuid}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="text-purple-500" />
                        <div>
                          <span className="text-sm font-mono font-medium text-foreground" title={set.set_uuid}>
                            {set.set_uuid.slice(0, 8)}...
                          </span>
                          <p className="text-xs text-muted-foreground">ID: {set.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-foreground">{set.number_of_samples}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-foreground">{parseScore(set.set_kmeans_score).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{formatDate(set.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {set.loadingThumbnails ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full border-2 border-t-transparent border-primary w-4 h-4" />
                            <span className="text-xs text-muted-foreground">Loading...</span>
                          </div>
                        ) : set.previewThumbnails.length > 0 ? (
                          <div className="flex -space-x-2">
                            {set.previewThumbnails.slice(0, 3).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-10 h-10 rounded-md border-2 border-background object-cover cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => handleViewThumbnails(set, index)}
                              />
                            ))}
                            {set.allSampleUuids.length > 3 && (
                              <div 
                                className="w-10 h-10 rounded-md border-2 border-background bg-muted flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => handleViewThumbnails(set, 0)}
                              >
                                <span className="text-xs font-medium text-muted-foreground">+{set.allSampleUuids.length - 3}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
                            <Eye size={12} />
                            No preview
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewThumbnails(set, 0)}
                          className="text-primary hover:text-primary/80 p-2 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="View thumbnails"
                          disabled={set.previewThumbnails.length === 0 && !set.loadingThumbnails}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMemorySet(set.set_uuid)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete memory set"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {modalOpen && selectedSetInfo && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/80'}`}
          onClick={handleBackdropClick}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4 w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseModal}
              className="absolute -top-2 -right-2 bg-background border border-border text-foreground rounded-full p-2 hover:bg-accent transition-colors shadow-lg z-10"
            >
              <X size={20} />
            </button>
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xl">
              {/* Modal Header */}
              <div className="p-4 border-b border-border bg-card">
                <h3 className="text-lg font-semibold text-card-foreground">Memory Set Samples</h3>
                <p className="text-sm text-muted-foreground">
                  Set ID: {selectedSetInfo.set_uuid.slice(0, 16)}... • 
                  {selectedSetInfo.allSampleUuids.length} samples • 
                  Score: {parseScore(selectedSetInfo.set_kmeans_score).toFixed(2)}
                </p>
              </div>
              
              {/* Image Display */}
              <div className="relative bg-card p-4">
                {selectedImages[currentImageIndex] ? (
                  <img
                    src={selectedImages[currentImageIndex]}
                    alt={`Memory set sample ${currentImageIndex + 1}`}
                    className="max-w-full max-h-[60vh] object-contain mx-auto"
                  />
                ) : (
                  <div className="flex items-center justify-center h-60 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full border-2 border-t-transparent border-primary w-8 h-8 mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading thumbnail...</p>
                    </div>
                  </div>
                )}
                
                {/* Navigation */}
                {selectedSetInfo.allSampleUuids.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-card border border-border text-card-foreground rounded-full p-2 hover:bg-accent hover:text-accent-foreground transition-colors shadow-lg"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-card border border-border text-card-foreground rounded-full p-2 hover:bg-accent hover:text-accent-foreground transition-colors rotate-180 shadow-lg"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border text-card-foreground px-3 py-1 rounded-full text-sm shadow-lg">
                      {currentImageIndex + 1} / {selectedSetInfo.allSampleUuids.length}
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
