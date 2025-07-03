import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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

export interface FavoriteStreamer {
  id: string;
  streamerUuid: string;
  streamerHrName: string;
  streamerType: string;
  configTemplateName: string;
  computeUnitIP: string;
  isAlive: string;
  ipAddress?: string;
  addedAt: string;
}

interface FavoritesContextType {
  favoriteStreamers: FavoriteStreamer[];
  addToFavorites: (streamer: FavoriteStreamer) => void;
  removeFromFavorites: (streamerUuid: string) => void;
  updateFavorite: (streamerUuid: string, updates: Partial<FavoriteStreamer>) => void;
  isFavorite: (streamerUuid: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// API functions for backend communication
const fetchFavorites = async (): Promise<FavoriteStreamer[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites`);
    if (response.ok) {
      return await response.json();
    }
    console.error('Failed to fetch favorites from backend');
    return [];
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
};

const addFavoriteToBackend = async (streamer: FavoriteStreamer): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(streamer),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error response:', errorData);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error adding favorite to backend:', error);
    return false;
  }
};

const removeFavoriteFromBackend = async (streamerUuid: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites/${streamerUuid}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Error removing favorite from backend:', error);
    return false;
  }
};

const FAVORITES_STORAGE_KEY = 'virtue-favorite-streamers';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favoriteStreamers, setFavoriteStreamers] = useState<FavoriteStreamer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from backend on mount
  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        const backendFavorites = await fetchFavorites();
        setFavoriteStreamers(backendFavorites);
      } catch (error) {
        console.error('Failed to load favorites from backend:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setFavoriteStreamers(parsed);
          } catch (parseError) {
            console.error('Failed to parse favorite streamers from localStorage:', parseError);
            localStorage.removeItem(FAVORITES_STORAGE_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Sync with backend periodically (every 30 seconds)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const backendFavorites = await fetchFavorites();
        setFavoriteStreamers(backendFavorites);
      } catch (error) {
        console.error('Failed to sync favorites with backend:', error);
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  // Save to localStorage whenever favorites change (backup)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStreamers));
    }
  }, [favoriteStreamers, isLoading]);

  const addToFavorites = async (streamer: FavoriteStreamer) => {
    // Check if already exists
    if (favoriteStreamers.some(fav => fav.streamerUuid === streamer.streamerUuid)) {
      return;
    }

    // Optimistically update UI
    const newStreamer = { ...streamer, addedAt: new Date().toISOString() };
    setFavoriteStreamers(prev => [...prev, newStreamer]);

    // Sync with backend
    const success = await addFavoriteToBackend(newStreamer);
    if (!success) {
      // Revert if backend sync failed
      setFavoriteStreamers(prev => prev.filter(fav => fav.streamerUuid !== streamer.streamerUuid));
      console.error('Failed to add favorite to backend');
    }
  };

  const removeFromFavorites = async (streamerUuid: string) => {
    // Optimistically update UI
    const originalFavorites = [...favoriteStreamers];
    setFavoriteStreamers(prev => prev.filter(fav => fav.streamerUuid !== streamerUuid));

    // Sync with backend
    const success = await removeFavoriteFromBackend(streamerUuid);
    if (!success) {
      // Revert if backend sync failed
      setFavoriteStreamers(originalFavorites);
      console.error('Failed to remove favorite from backend');
    }
  };

  const isFavorite = (streamerUuid: string): boolean => {
    return favoriteStreamers.some(fav => fav.streamerUuid === streamerUuid);
  };

  const clearFavorites = async () => {
    const originalFavorites = [...favoriteStreamers];
    setFavoriteStreamers([]);

    // Remove all from backend
    try {
      const deletePromises = originalFavorites.map(fav => removeFavoriteFromBackend(fav.streamerUuid));
      await Promise.all(deletePromises);
    } catch (error) {
      // Revert if backend sync failed
      setFavoriteStreamers(originalFavorites);
      console.error('Failed to clear favorites from backend');
    }
  };

  const updateFavorite = (streamerUuid: string, updates: Partial<FavoriteStreamer>) => {
    setFavoriteStreamers(prev => 
      prev.map(fav => 
        fav.streamerUuid === streamerUuid 
          ? { ...fav, ...updates }
          : fav
      )
    );
    
    console.log(`Updated favorite streamer ${streamerUuid}:`, updates);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteStreamers,
        addToFavorites,
        removeFromFavorites,
        updateFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
