import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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
  isFavorite: (streamerUuid: string) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'virtue-favorite-streamers';

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [favoriteStreamers, setFavoriteStreamers] = useState<FavoriteStreamer[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFavoriteStreamers(parsed);
      } catch (error) {
        console.error('Failed to parse favorite streamers from localStorage:', error);
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
      }
    }
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteStreamers));
  }, [favoriteStreamers]);

  const addToFavorites = (streamer: FavoriteStreamer) => {
    setFavoriteStreamers(prev => {
      // Check if already exists
      if (prev.some(fav => fav.streamerUuid === streamer.streamerUuid)) {
        return prev;
      }
      return [...prev, { ...streamer, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromFavorites = (streamerUuid: string) => {
    setFavoriteStreamers(prev => prev.filter(fav => fav.streamerUuid !== streamerUuid));
  };

  const isFavorite = (streamerUuid: string): boolean => {
    return favoriteStreamers.some(fav => fav.streamerUuid === streamerUuid);
  };

  const clearFavorites = () => {
    setFavoriteStreamers([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteStreamers,
        addToFavorites,
        removeFromFavorites,
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
