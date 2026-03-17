import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { FaBell, FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function LowStockSettings({ isOpen, onClose }) {
  const { lowStockThreshold, updateLowStockThreshold, getLowStockProducts } = useProducts();
  const [tempThreshold, setTempThreshold] = useState(lowStockThreshold);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTempThreshold(lowStockThreshold);
    }
  }, [isOpen, lowStockThreshold]);

  const handleSave = async () => {
    if (tempThreshold < 1 || tempThreshold > 100) {
      alert('Please enter a value between 1 and 100');
      return;
    }

    setSaving(true);
    const result = await updateLowStockThreshold(tempThreshold);
    
    if (result.success) {
      alert('Low stock threshold updated successfully!');
      onClose();
    } else {
      alert('Failed to update threshold: ' + result.error);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    setTempThreshold(lowStockThreshold);
    onClose();
  };

  const lowStockProducts = getLowStockProducts();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Compact */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <FaBell className="text-yellow-600 dark:text-yellow-400 text-sm sm:text-lg" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Low Stock Alert Settings
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                  Configure your stock alerts
                </p>
              </div>
            </div>
            
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <FaTimes className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Current Status - Compact */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      Current threshold
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {lowStockThreshold} {lowStockThreshold === 1 ? 'unit' : 'units'}
                    </p>
                  </div>

                  {lowStockProducts.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                      <FaExclamationTriangle className="text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm" />
                      <span className="text-xs sm:text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                        {lowStockProducts.length} low
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Threshold Input - Compact */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                  Alert when stock drops to:
                </label>
                
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                  <button
                    onClick={() => setTempThreshold(Math.max(1, tempThreshold - 1))}
                    className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition active:scale-95"
                  >
                    <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">−</span>
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tempThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= 100) {
                        setTempThreshold(val);
                      }
                    }}
                    className="w-24 sm:w-32 px-3 sm:px-4 py-3 sm:py-4 border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-700 dark:text-white rounded-xl text-2xl sm:text-3xl font-bold text-center focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                  />

                  <button
                    onClick={() => setTempThreshold(Math.min(100, tempThreshold + 1))}
                    className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition active:scale-95"
                  >
                    <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-300">+</span>
                  </button>
                </div>

                <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  units
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                  Products with {tempThreshold} or fewer units will be marked as low stock
                </p>
              </div>

              {/* Quick Presets - Compact */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Quick presets:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTempThreshold(preset)}
                      className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition active:scale-95 ${
                        tempThreshold === preset
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box - Compact, Hidden on small screens */}
              <div className="hidden sm:flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <FaBell className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 text-sm" />
                <div className="text-sm text-blue-900 dark:text-blue-300">
                  <p className="font-semibold mb-0.5 text-xs">Why set this?</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Get alerts before items run out completely.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex gap-2 sm:gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-semibold transition disabled:opacity-50 text-sm sm:text-base"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base active:scale-95"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <FaCheck />
                  Save
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}