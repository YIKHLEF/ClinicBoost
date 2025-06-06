import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface NetworkConnection extends EventTarget {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

const getConnection = (): NetworkConnection | undefined => {
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
};

const getNetworkStatus = (): NetworkStatus => {
  const connection = getConnection();
  
  return {
    isOnline: navigator.onLine,
    isSlowConnection: connection ? ['slow-2g', '2g'].includes(connection.effectiveType) : false,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };
};

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(getNetworkStatus);
  const [lastOnlineTime, setLastOnlineTime] = useState<number>(Date.now());
  const [offlineDuration, setOfflineDuration] = useState<number>(0);

  const updateNetworkStatus = useCallback(() => {
    const newStatus = getNetworkStatus();
    setNetworkStatus(prevStatus => {
      // Track when we go online/offline
      if (prevStatus.isOnline !== newStatus.isOnline) {
        if (newStatus.isOnline) {
          // Coming back online
          setOfflineDuration(Date.now() - lastOnlineTime);
          setLastOnlineTime(Date.now());
        } else {
          // Going offline
          setLastOnlineTime(Date.now());
        }
      }
      return newStatus;
    });
  }, [lastOnlineTime]);

  useEffect(() => {
    // Update network status on mount
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  // Periodically check connection quality
  useEffect(() => {
    if (!networkStatus.isOnline) return;

    const checkConnectionQuality = async () => {
      try {
        const start = performance.now();
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache' 
        });
        const end = performance.now();
        
        if (response.ok) {
          const latency = end - start;
          setNetworkStatus(prev => ({
            ...prev,
            isSlowConnection: latency > 2000, // Consider slow if > 2s
          }));
        }
      } catch (error) {
        // Network request failed, might be offline
        setNetworkStatus(prev => ({
          ...prev,
          isOnline: false,
        }));
      }
    };

    // Check connection quality every 30 seconds when online
    const interval = setInterval(checkConnectionQuality, 30000);
    
    return () => clearInterval(interval);
  }, [networkStatus.isOnline]);

  return {
    ...networkStatus,
    lastOnlineTime,
    offlineDuration,
    isConnected: networkStatus.isOnline,
    isDisconnected: !networkStatus.isOnline,
    hasGoodConnection: networkStatus.isOnline && !networkStatus.isSlowConnection,
    shouldUseOfflineMode: !networkStatus.isOnline || networkStatus.isSlowConnection,
  };
};

export default useNetworkStatus;
