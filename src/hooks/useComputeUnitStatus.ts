import { useState, useEffect, useCallback, useRef } from 'react';

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

// API Base URL - Flask backend (configurable and dynamic)
const API_BASE_URL = getAPIBaseURL();

// Define interfaces for the hook
export interface BaseComputeUnit {
  id: string;
  name: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'pending';
  lastSeen?: string;
}

export interface Camera {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  streamerUuid: string;
  computeUnitIP: string;
  [key: string]: any; // Allow other properties
}

export interface ComputeUnit extends BaseComputeUnit {
  cameras: Camera[];
}

interface UseComputeUnitStatusProps {
  componentName: string;
  autoCheckInterval?: number;
  pollingInterval?: number;
  enableAutoCheck?: boolean;
  enablePolling?: boolean;
  enableVisibilityRefresh?: boolean;
}

// --- API Functions ---

// Ping a device to check its real-time status
const pingDevice = async (ipAddress: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ping?ip=${encodeURIComponent(ipAddress)}`);
    if (response.ok) {
      const data = await response.json();
      return data.msg === 'pong'; // Only "pong" is a valid success
    }
    return false;
  } catch (error) {
    console.error(`[Hook] Ping failed for ${ipAddress}:`, error);
    return false;
  }
};

// Update compute unit status in our backend
const updateComputeUnitStatusInBackend = async (unitId: string, status: 'online' | 'offline' | 'pending'): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/compute_units/${unitId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return response.ok;
  } catch (error) {
    console.error(`[Hook] Failed to update unit ${unitId} status in backend:`, error);
    return false;
  }
};


// The main hook
export const useComputeUnitStatus = ({
  componentName,
  autoCheckInterval = 15000,
  pollingInterval = 10000,
  enableAutoCheck = true,
  enablePolling = true,
  enableVisibilityRefresh = true,
}: UseComputeUnitStatusProps) => {
  // State for all compute units, including their cameras
  const [computeUnits, setComputeUnits] = useState<ComputeUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null); // Add error state

  // Use a ref to store the latest state to avoid stale closures in intervals
  const computeUnitsRef = useRef(computeUnits);
  computeUnitsRef.current = computeUnits;

  // --- Core Logic ---

  // 1. Polls the backend for the list of registered compute units and their cameras
  const pollBackendForUpdates = useCallback(async () => {
    console.log(`🔄 [Hook - ${componentName}] Polling backend for updates...`);
    setError(null); // Clear previous errors on new poll

    try {
      // Get compute units from backend - this call also syncs cameras if units are online
      const response = await fetch(`${API_BASE_URL}/api/compute_units`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch compute units: ${response.status}`);
      }
      
      const data = await response.json();
      const updatedUnits: ComputeUnit[] = data.compute_units.map((unit: any) => ({
        id: unit.id,
        name: unit.name,
        ipAddress: unit.ip_address || unit.ipAddress,
        status: unit.status,
        lastSeen: unit.last_seen || unit.lastSeen || undefined,
        cameras: (unit.cameras || []).map((cam: any) => ({
          id: cam.id ? cam.id.toString() : cam.streamer_uuid,
          name: cam.streamer_hr_name || cam.name,
          status: cam.status === 'active' || cam.is_alive === '1' ? 'active' : 'inactive',
          streamerUuid: cam.streamer_uuid,
          computeUnitIP: unit.ip_address || unit.ipAddress,
          features: cam.features ? (typeof cam.features === 'string' ? JSON.parse(cam.features) : cam.features) : [],
          // Include all other properties
          ...cam,
        })),
      }));

      setComputeUnits(updatedUnits);
      setLastSyncTime(new Date());
      setLoading(false);
      console.log(`✅ [Hook - ${componentName}] Polling complete. Units:`, updatedUnits.length);
    } catch (error) {
      setLoading(false);
      setError('Failed to fetch data from server.'); // Set a user-friendly error message
      console.error(`[Hook - ${componentName}] Error during polling:`, error);
    }
  }, [componentName]);


  // 2. Actively pings devices to check their real-time status
  const checkDevicesStatus = useCallback(async () => {
    console.log(`📡 [Hook - ${componentName}] Checking device statuses...`);
    const currentUnits = computeUnitsRef.current;
    if (currentUnits.length === 0) return;

    const statusUpdatePromises = currentUnits.map(async (unit) => {
      const isReachable = await pingDevice(unit.ipAddress);
      const newStatus = isReachable ? 'online' : 'offline';

      if (unit.status !== newStatus) {
        console.log(`❗️ [Hook - ${componentName}] Status change for ${unit.name}: ${unit.status} -> ${newStatus}`);
        await updateComputeUnitStatusInBackend(unit.id, newStatus);
        return true; // Indicates a change occurred
      }
      return false;
    });

    const results = await Promise.all(statusUpdatePromises);
    // If any status changed, trigger a poll to get the latest data immediately
    if (results.some(changed => changed)) {
      console.log(`🚀 [Hook - ${componentName}] Status change detected, triggering immediate poll.`);
      await pollBackendForUpdates();
    }
  }, [componentName, pollBackendForUpdates]);

  // --- Effects ---

  // Initial load and polling interval
  useEffect(() => {
    if (!enablePolling) return;
    
    pollBackendForUpdates(); // Initial fetch
    
    const intervalId = setInterval(pollBackendForUpdates, pollingInterval);
    return () => clearInterval(intervalId);
  }, [enablePolling, pollingInterval, pollBackendForUpdates]);

  // Auto-check (ping) interval
  useEffect(() => {
    if (!enableAutoCheck) return;
    
    const intervalId = setInterval(checkDevicesStatus, autoCheckInterval);
    return () => clearInterval(intervalId);
  }, [enableAutoCheck, autoCheckInterval, checkDevicesStatus]);

  // Refresh data when tab becomes visible again
  useEffect(() => {
    if (!enableVisibilityRefresh) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`✨ [Hook - ${componentName}] Tab is visible, refreshing data.`);
        pollBackendForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enableVisibilityRefresh, componentName, pollBackendForUpdates]);


  return {
    computeUnits,
    loading,
    lastSyncTime,
    error,
    refresh: pollBackendForUpdates, // Expose a manual refresh function
  };
};
