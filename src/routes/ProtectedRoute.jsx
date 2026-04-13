import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { FaSpinner } from 'react-icons/fa';

export default function ProtectedRoute({ children, requireAdmin = false, requirePermission = null }) {
  const { user, role, loading, hasPermission } = usePermissions();

  // 🔥 Show loading while checking auth and permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // 🔥 Redirect to login if not authenticated
  if (!user) {
    console.log('❌ No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔐 ProtectedRoute check:', { 
    user: user?.email, 
    role, 
    requireAdmin, 
    requirePermission 
  });

  // 🔥 Check admin requirement
  if (requireAdmin && role !== 'admin') {
    console.log('❌ Admin required but user role is:', role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access this page. Admin access required.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Your role: {role || 'Unknown'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // 🔥 Check specific permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    console.log('❌ Permission required:', requirePermission);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Permission Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have the required permission to access this feature.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  console.log('✅ Access granted');
  return children;
}