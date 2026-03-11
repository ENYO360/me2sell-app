import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 🔥 First, wait for auth to initialize
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // If no user, stop loading immediately
      if (!currentUser) {
        setLoading(false);
        setRole(null);
        setPermissions(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Then fetch permissions when user is available
  useEffect(() => {
    if (!user) return;

    const fetchPermissions = async () => {
      try {
        setLoading(true);

        // Check if user has a businessProfile (means they're admin)
        const businessProfileDoc = await getDoc(doc(db, 'businessProfiles', user.uid));
        
        if (businessProfileDoc.exists()) {
          console.log('✅ User is ADMIN (has businessProfile)');
          setRole('admin');
          setPermissions('admin');
          localStorage.setItem('userRole', 'admin');
          
          // Ensure users collection has role field
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists() || !userDoc.data().role) {
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              role: 'admin',
              createdAt: serverTimestamp(),
            }, { merge: true });
          }
          
          setLoading(false);
          return;
        }

        // Check if they're staff
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          console.warn('⚠️ User document not found for:', user.uid);
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('📋 User data:', userData);
        
        if (userData.role === 'staff') {
          console.log('✅ User is STAFF');
          setRole('staff');
          
          const staffDoc = await getDoc(doc(db, 'staff', user.uid));
          if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            setPermissions(staffData.permissions);
            
            localStorage.setItem('userRole', 'staff');
            localStorage.setItem('staffPermissions', JSON.stringify(staffData.permissions));
          } else {
            console.error('❌ Staff document not found');
          }
        } else if (userData.role === 'admin') {
          console.log('✅ User is ADMIN (from users collection)');
          setRole('admin');
          setPermissions('admin');
          localStorage.setItem('userRole', 'admin');
        } else {
          console.warn('⚠️ Unknown role:', userData.role);
        }
      } catch (error) {
        console.error('❌ Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]); // Re-run when user changes

  const canAccessDepartment = (departmentId) => {
    if (role === 'admin') return true;
    if (!permissions) return false;
    if (permissions === 'admin') return true;
    if (permissions.departments === 'all') return true;
    return permissions.departments?.includes(departmentId) || false;
  };

  const canAccessCategory = (categoryId) => {
    if (role === 'admin') return true;
    if (!permissions) return false;
    if (permissions === 'admin') return true;
    if (permissions.categories === 'all') return true;
    return permissions.categories?.includes(categoryId) || false;
  };

  const hasPermission = (permissionKey) => {
    if (role === 'admin') return true;
    if (!permissions) return false;
    if (permissions === 'admin') return true;
    return permissions[permissionKey] || false;
  };

  return {
    permissions,
    role,
    loading,
    user, // 🔥 Expose user so ProtectedRoute doesn't need its own listener
    canAccessDepartment,
    canAccessCategory,
    hasPermission,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
  };
}