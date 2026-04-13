// src/components/LocationPermissionModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaTimes, FaSpinner } from 'react-icons/fa';
import { useMyLocation } from '../hooks/useLocation';

export default function LocationPermissionModal({ isOpen, onClose, onSuccess }) {
  const { locationStatus, updateLocation } = useMyLocation();
  const [requesting, setRequesting] = useState(false);

  const handleEnableLocation = async () => {
    setRequesting(true);
    const result = await updateLocation();
    setRequesting(false);

    if (result.success) {
      onSuccess?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaMapMarkerAlt className="text-2xl" />
                </div>
                <h3 className="text-lg font-bold">Enable Location</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We use your location to connect you with nearby buyers and provide better marketplace recommendations.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-300">
                <p className="font-semibold mb-2">🔒 Your Privacy Matters</p>
                <ul className="text-left space-y-1 text-xs">
                  <li>✓ Only city/state level location is stored</li>
                  <li>✓ No precise GPS tracking</li>
                  <li>✓ Updated only when you use the app</li>
                  <li>✓ Can be disabled anytime in settings</li>
                </ul>
              </div>
            </div>

            {/* Error Message */}
            {locationStatus.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {locationStatus.error}
              </div>
            )}

            {/* Status Messages */}
            {locationStatus.permission === 'denied' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
                Location permission was denied. Please enable it in your browser settings.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-semibold transition"
            >
              Maybe Later
            </button>

            <button
              onClick={handleEnableLocation}
              disabled={requesting || locationStatus.permission === 'denied'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requesting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <FaMapMarkerAlt />
                  Enable Location
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}