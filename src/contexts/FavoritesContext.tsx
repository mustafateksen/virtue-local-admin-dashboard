import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  refreshFavorites: () => Promise<void>;
  removeFavoritesByComputeUnitIP: (computeUnitIP: string) => Promise<void>;
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

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favoriteStreamers, setFavoriteStreamers] = useState<FavoriteStreamer[]>([]);

  // Load favorites from backend on initial load
  useEffect(() => {
    const loadFavorites = async () => {
      const backendFavorites = await fetchFavorites();
      setFavoriteStreamers(backendFavorites);
    };

    loadFavorites();
  }, []);

  const addToFavorites = useCallback(async (streamer: FavoriteStreamer) => {
    const success = await addFavoriteToBackend(streamer);
    if (success) {
      setFavoriteStreamers((prev) => [...prev, streamer]);
    } else {
      console.error('Failed to add favorite to backend.');
    }
  }, []);

  const removeFromFavorites = useCallback(async (streamerUuid: string) => {
    const success = await removeFavoriteFromBackend(streamerUuid);
    if (success) {
      setFavoriteStreamers((prev) => prev.filter((s) => s.streamerUuid !== streamerUuid));
    } else {
      console.error('Failed to remove favorite from backend.');
    }
  }, []);

  const updateFavorite = useCallback(async (streamerUuid: string, updates: Partial<FavoriteStreamer>) => {
    // This is a placeholder. In a real app, you would also update the backend.
    setFavoriteStreamers(prev => 
      prev.map(s => s.streamerUuid === streamerUuid ? { ...s, ...updates } : s)
    );
  }, []);

  const clearFavorites = useCallback(() => {
    // This is a placeholder. In a real app, you would also clear the backend.
    setFavoriteStreamers([]);
  }, []);

  const isFavorite = useCallback(
    (streamerUuid: string) => {
      return favoriteStreamers.some((s) => s.streamerUuid === streamerUuid);
    },
    [favoriteStreamers]
  );

  // This function is not strictly needed if we trust the backend as the source of truth,
  // but can be useful for manual refresh actions.
  const refreshFavorites = useCallback(async () => {
    const backendFavorites = await fetchFavorites();
    setFavoriteStreamers(backendFavorites);
  }, []);

  const removeFavoritesByComputeUnitIP = useCallback(async (computeUnitIP: string) => {
    // Find all favorites from this compute unit
    const favoritesToRemove = favoriteStreamers.filter(
      fav => fav.computeUnitIP === computeUnitIP
    );

    // Remove each favorite from backend
    for (const favorite of favoritesToRemove) {
      await removeFavoriteFromBackend(favorite.streamerUuid);
    }

    // Update local state
    setFavoriteStreamers(prev => 
      prev.filter(fav => fav.computeUnitIP !== computeUnitIP)
    );

    console.log(`Removed ${favoritesToRemove.length} favorites from compute unit ${computeUnitIP}`);
  }, [favoriteStreamers]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteStreamers,
        addToFavorites,
        removeFromFavorites,
        updateFavorite,
        isFavorite,
        clearFavorites,
        refreshFavorites, // Expose refresh function
        removeFavoritesByComputeUnitIP, // Expose compute unit removal function
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
