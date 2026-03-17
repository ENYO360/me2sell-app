import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [role,        setRole]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [user,        setUser]        = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

      // ── Not logged in ────────────────────────────────────────────
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setPermissions(null);
        setLoading(false);
        return;
      }

      // ── Logged in — fetch role BEFORE clearing loading ───────────
      // On hosted, getDoc takes 300–500ms over the network.
      // Any render before it completes sees role=null and blanks out.
      // Keeping loading=true until the finally block prevents this.
      setUser(currentUser);

      try {
        // 1. Check if user has a businessProfile (admin)
        const businessProfileDoc = await getDoc(doc(db, 'businessProfiles', currentUser.uid));

        if (businessProfileDoc.exists()) {
          console.log('✅ User is ADMIN (has businessProfile)');
          setRole('admin');
          setPermissions('admin');
          localStorage.setItem('userRole', 'admin');

          // Backfill users collection role field if missing
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!userDoc.exists() || !userDoc.data().role) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              email: currentUser.email,
              role: 'admin',
              createdAt: serverTimestamp(),
            }, { merge: true });
          }
          return; // finally will setLoading(false)
        }

        // 2. Check users collection for staff or admin role
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (!userDoc.exists()) {
          console.warn('⚠️ User document not found for:', currentUser.uid);
          return;
        }

        const userData = userDoc.data();
        console.log('📋 User data:', userData);

        if (userData.role === 'staff') {
          console.log('✅ User is STAFF');
          setRole('staff');

          const staffDoc = await getDoc(doc(db, 'staff', currentUser.uid));
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
        // ✅ Only runs after ALL awaits complete —
        // both auth and Firestore role resolved before any route renders.
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []); // single effect, runs once on mount

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
    user,
    canAccessDepartment,
    canAccessCategory,
    hasPermission,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
  };
}