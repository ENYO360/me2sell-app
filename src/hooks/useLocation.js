// src/hooks/useLocation.js
import { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function useMyLocation() {
  const [locationStatus, setLocationStatus] = useState({
    permission: null, // 'granted', 'denied', 'prompt'
    loading: false,
    error: null,
    lastUpdate: null,
  });

  // Check if location permission is granted
  useEffect(() => {
    if ('geolocation' in navigator && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationStatus((prev) => ({ ...prev, permission: result.state }));

        // Listen for permission changes
        result.addEventListener('change', () => {
          setLocationStatus((prev) => ({ ...prev, permission: result.state }));
        });
      });
    }
  }, []);

  // Request location and update Firebase
  const updateLocation = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLocationStatus((prev) => ({ ...prev, error: 'User not authenticated' }));
      return { success: false, error: 'Not authenticated' };
    }

    setLocationStatus((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        const error = 'Geolocation not supported';
        setLocationStatus((prev) => ({ ...prev, loading: false, error }));
        resolve({ success: false, error });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Call Firebase Function
            const functions = getFunctions();
            const updateUserLocation = httpsCallable(functions, 'locationSync-updateUserLocation');

            const result = await updateUserLocation({
              latitude,
              longitude,
            });

            const lastUpdate = Date.now();
            localStorage.setItem(`location_updated_${user.uid}`, lastUpdate.toString());

            setLocationStatus({
              permission: 'granted',
              loading: false,
              error: null,
              lastUpdate,
            });

            console.log('✅ Location updated:', result.data);
            resolve({ success: true, data: result.data });
          } catch (error) {
            console.error('❌ Location update failed:', error);
            setLocationStatus((prev) => ({
              ...prev,
              loading: false,
              error: error.message,
            }));
            resolve({ success: false, error: error.message });
          }
        },
        (error) => {
          let errorMessage = 'Failed to get location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              setLocationStatus((prev) => ({ ...prev, permission: 'denied' }));
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'Unknown location error';
          }

          console.error('Location error:', errorMessage);
          setLocationStatus((prev) => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));

          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: false, // Set to true for GPS, false for faster network location
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    locationStatus,
    updateLocation,
  };
}