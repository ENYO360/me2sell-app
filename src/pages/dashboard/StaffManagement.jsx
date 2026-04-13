import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../../firebase/config'; // ✅ import firebaseConfig
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app'; // ✅ single source for initializeApp
import ProductImageCarousel from './ProductImageCarousel';
import DashboardLayout from '../../pages/dashboard/O_DashboardLayout';
import SaleModal from './SaleModal';
import { useCart } from "../../context/CartContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";
import { useSearch } from "../../context/SearchContext";
import {
  FaPlus,
  FaUser,
  FaEdit,
  FaTrash,
  FaPause,
  FaPlay,
  FaShieldAlt,
  FaEllipsisV,
  FaSpinner,
  FaTimes,
  FaCheck,
  FaMoneyBillWave,
  FaShoppingCart
} from 'react-icons/fa';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMenu, setActionMenu] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const { addToCart } = useCart();
  const { startSale } = useDirectSale();
  const { currency } = useCurrency();
  const { products, lowStockThreshold } = useProducts();
  const { setScope, results } = useSearch();

  // Fetch staff on mount
  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const businessId = user.uid;

      console.log('Fetching staff for businessId:', businessId);

      const staffQuery = query(
        collection(db, 'staff'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
      );

      const staffSnapshot = await getDocs(staffQuery);
      const staffData = staffSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('Fetched staff:', staffData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);

      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        alert(
          'Firestore index required. Please create the index:\n\nCollection: staff\nFields: businessId (Ascending), createdAt (Descending)'
        );
      } else {
        alert('Failed to load staff. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Suspend - update Firestore only
  const handleSuspendStaff = async (staffId) => {
    if (!window.confirm('Suspend this staff member?')) return;
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        status: 'suspended',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', staffId), { status: 'suspended' });

      setStaff(staff.map((s) => (s.id === staffId ? { ...s, status: 'suspended' } : s)));
      alert('Staff suspended');
    } catch (error) {
      alert('Failed: ' + error.message);
    }
    setActionMenu(null);
  };

  // Delete - remove from Firestore
  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`Delete ${staffName}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', staffId));
      await deleteDoc(doc(db, 'staff', staffId));

      setStaff(staff.filter((s) => s.id !== staffId));
      alert('Staff deleted');
    } catch (error) {
      alert('Failed: ' + error.message);
    }
    setActionMenu(null);
  };

  const handleActivateStaff = async (staffId) => {
    if (!window.confirm('Activate this staff member?')) return;
    try {
      await updateDoc(doc(db, 'staff', staffId), {
        status: 'active',
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', staffId), { status: 'active' });

      setStaff(staff.map((s) => (s.id === staffId ? { ...s, status: 'active' } : s)));
      alert('Staff activated successfully');
    } catch (error) {
      console.error('Error activating staff:', error);
      alert('Failed to activate staff: ' + error.message);
    }
    setActionMenu(null);
  };

  // ─── Create Staff Modal ───────────────────────────────────────────────────────

  function CreateStaffModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'cashier',
    });

    const [permissions, setPermissions] = useState({
      departments: [],
      categories: [],
    });

    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
      if (!isOpen) return;

      const fetchData = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;

          const deptSnapshot = await getDocs(
            collection(db, 'departments', user.uid, 'userDepartments')
          );
          setDepartments(
            deptSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
          );

          const catSnapshot = await getDocs(
            collection(db, 'categories', user.uid, 'userCategories')
          );
          setCategories(
            catSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
          );
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }, [isOpen]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        const adminUser = auth.currentUser;
        if (!adminUser) throw new Error('Not authenticated');

        const adminUid = adminUser.uid;

        // ✅ Safely initialise secondary app — avoid duplicate app error on re-submit
        const secondaryApp =
          getApps().find((app) => app.name === 'Secondary') ??
          initializeApp(firebaseConfig, 'Secondary');

        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email,
          formData.password
        );

        const newStaffUser = userCredential.user;

        await updateProfile(newStaffUser, { displayName: formData.fullName });

        // Sign out from secondary app
        await secondaryAuth.signOut();

        const staffUid = newStaffUser.uid;

        await setDoc(doc(db, 'users', staffUid), {
          email: formData.email,
          role: 'staff',
          businessId: adminUid,
          status: 'active',
          createdAt: serverTimestamp(),
          lastLogin: null,
        });

        await setDoc(doc(db, 'staff', staffUid), {
          businessId: adminUid,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone || '',
          role: formData.role,
          status: 'active',
          createdAt: serverTimestamp(),
          createdBy: adminUid,
          lastLogin: null,
          permissions,
        });

        await addDoc(collection(db, 'staffActivity'), {
          businessId: adminUid,
          staffId: staffUid,
          staffName: formData.fullName,
          action: 'staff_created',
          details: { role: formData.role, email: formData.email, password: formData.password },
          timestamp: serverTimestamp(),
        });

        alert('Staff created successfully!');
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Error creating staff:', error);

        let errorMessage = 'Failed to create staff';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Email already in use';
        else if (error.code === 'auth/weak-password') errorMessage = 'Password too weak (min 6 chars)';
        else if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
        else errorMessage = error.message;

        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const toggleDepartment = (deptId) => {
      setPermissions((prev) => {
        if (prev.departments === 'all') return { ...prev, departments: [deptId] };
        const newDepts = prev.departments.includes(deptId)
          ? prev.departments.filter((d) => d !== deptId)
          : [...prev.departments, deptId];
        return { ...prev, departments: newDepts };
      });
    };

    const toggleCategory = (catId) => {
      setPermissions((prev) => {
        if (prev.categories === 'all') return { ...prev, categories: [catId] };
        const newCats = prev.categories.includes(catId)
          ? prev.categories.filter((c) => c !== catId)
          : [...prev.categories, catId];
        return { ...prev, categories: newCats };
      });
    };

    const setAllDepartments = () => {
      setPermissions((prev) => ({
        ...prev,
        departments: prev.departments === 'all' ? [] : 'all',
      }));
    };

    const setAllCategories = () => {
      setPermissions((prev) => ({
        ...prev,
        categories: prev.categories === 'all' ? [] : 'all',
      }));
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Staff</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <FaTimes className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Minimum 6 characters
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="sales_rep">Sales Representative</option>
                      <option value="inventory_manager">Inventory Manager</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Permissions
                </h3>

                {loadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <FaSpinner className="animate-spin text-2xl text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Department Access */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Department Access
                        </label>
                        <button
                          type="button"
                          onClick={setAllDepartments}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition ${permissions.departments === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                          {permissions.departments === 'all' ? '✓ All Departments' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {departments.map((dept) => (
                          <label
                            key={dept.id}
                            className="flex items-center gap-2 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissions.departments === 'all' ||
                                permissions.departments.includes(dept.id)
                              }
                              onChange={() => toggleDepartment(dept.id)}
                              disabled={permissions.departments === 'all'}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {dept.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Category Access */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Category Access
                        </label>
                        <button
                          type="button"
                          onClick={setAllCategories}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition ${permissions.categories === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                          {permissions.categories === 'all' ? '✓ All Categories' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {categories.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissions.categories === 'all' ||
                                permissions.categories.includes(cat.id)
                              }
                              onChange={() => toggleCategory(cat.id)}
                              disabled={permissions.categories === 'all'}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {cat.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingData}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Staff'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── Edit Permissions Modal ───────────────────────────────────────────────────

  function EditPermissionsModal({ isOpen, onClose, staff, onSuccess }) {
    const [permissions, setPermissions] = useState(staff?.permissions || {});
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
      if (!isOpen || !staff) return;

      setPermissions(staff.permissions);

      const fetchData = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;

          const deptSnapshot = await getDocs(
            collection(db, 'departments', user.uid, 'userDepartments')
          );
          setDepartments(
            deptSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
          );

          const catSnapshot = await getDocs(
            collection(db, 'categories', user.uid, 'userCategories')
          );
          setCategories(
            catSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }))
          );
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoadingData(false);
        }
      };

      fetchData();
    }, [isOpen, staff]);

    // ✅ Direct Firestore update — no Cloud Function
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
        await updateDoc(doc(db, 'staff', staff.id), {
          permissions,
          updatedAt: serverTimestamp(),
        });

        alert('Permissions updated successfully!');
        onSuccess();
        onClose();
      } catch (error) {
        console.error('Error updating permissions:', error);
        alert('Failed to update permissions: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const toggleDepartment = (deptId) => {
      setPermissions((prev) => {
        if (prev.departments === 'all') return { ...prev, departments: [deptId] };
        const newDepts = prev.departments.includes(deptId)
          ? prev.departments.filter((d) => d !== deptId)
          : [...prev.departments, deptId];
        return { ...prev, departments: newDepts };
      });
    };

    const toggleCategory = (catId) => {
      setPermissions((prev) => {
        if (prev.categories === 'all') return { ...prev, categories: [catId] };
        const newCats = prev.categories.includes(catId)
          ? prev.categories.filter((c) => c !== catId)
          : [...prev.categories, catId];
        return { ...prev, categories: newCats };
      });
    };

    const setAllDepartments = () => {
      setPermissions((prev) => ({
        ...prev,
        departments: prev.departments === 'all' ? [] : 'all',
      }));
    };

    const setAllCategories = () => {
      setPermissions((prev) => ({
        ...prev,
        categories: prev.categories === 'all' ? [] : 'all',
      }));
    };

    if (!isOpen || !staff) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Permissions
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {staff.fullName} — {staff.role.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <FaTimes className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-3xl text-blue-600" />
                </div>
              ) : (
                <>
                  {/* Department Access */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Department Access
                      </label>
                      <button
                        type="button"
                        onClick={setAllDepartments}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition ${permissions.departments === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                          }`}
                      >
                        {permissions.departments === 'all' ? '✓ All Departments' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {departments.map((dept) => (
                        <label
                          key={dept.id}
                          className="flex items-center gap-2 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          <input
                            type="checkbox"
                            checked={
                              permissions.departments === 'all' ||
                              permissions.departments?.includes(dept.id)
                            }
                            onChange={() => toggleDepartment(dept.id)}
                            disabled={permissions.departments === 'all'}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {dept.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Access */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Category Access
                      </label>
                      <button
                        type="button"
                        onClick={setAllCategories}
                        className={`text-xs px-3 py-1 rounded-full font-medium transition ${permissions.categories === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                          }`}
                      >
                        {permissions.categories === 'all' ? '✓ All Categories' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          <input
                            type="checkbox"
                            checked={
                              permissions.categories === 'all' ||
                              permissions.categories?.includes(cat.id)
                            }
                            onChange={() => toggleCategory(cat.id)}
                            disabled={permissions.categories === 'all'}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {cat.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingData}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Shared product card (search results) ─────────────────────────────────────
  function ProductCard({ product, currency, addToCart, startSale, lowStockThreshold }) {
    const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
    const isOut = product.quantity === 0;

    return (
      <motion.div
        key={product.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
        ${isOut ? "opacity-70 border-gray-100" : "border-gray-100 hover:shadow-md hover:border-[#03165A]/15"}`}
      >
        <div className={`h-1 w-full ${isOut ? "bg-red-400" : isLowStock ? "bg-amber-400" : "bg-gradient-to-r from-[#03165A] to-green-500"}`} />
        <div className="relative">
          <ProductImageCarousel images={[product.image, product.image2].filter(Boolean)} />
          {isLowStock && !isOut && (
            <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full animate-pulse">
              Low · {product.quantity}
            </span>
          )}
          {isOut && (
            <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
              Out of Stock
            </span>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{product.name}</h3>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Qty: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"}`}>{product.quantity}</span></span>
            <span className="font-black text-[#03165A]">{currency.symbol}{product.sellingPrice.toLocaleString()}</span>
          </div>
          {isOut ? (
            <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">Out of Stock</div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => addToCart(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
                <FaShoppingCart className="text-[10px]" /> Add
              </button>
              <button onClick={() => startSale(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
                <FaMoneyBillWave className="text-[10px]" /> Sell
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Search results view ─────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#03165A]">Search Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{results.length} product{results.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency}
                addToCart={addToCart} startSale={startSale} lowStockThreshold={lowStockThreshold} />
            ))}
          </div>
        </div>
        <SaleModal />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your team and their permissions
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition shadow-lg"
          >
            <FaPlus /> Add Staff
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{staff.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {staff.filter((s) => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {staff.filter((s) => s.status === 'suspended').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {staff.filter((s) => s.role === 'manager').length}
            </p>
          </div>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <FaUser className="text-5xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Staff Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by adding your first staff member
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Add Staff
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Staff Member
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Last Login
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y dark:divide-gray-700">
                  {staff.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {member.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {member.fullName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {member.email}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.password}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium capitalize">
                          {member.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${member.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : member.status === 'suspended'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          {member.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {member.lastLogin
                          ? new Date(member.lastLogin.seconds * 1000).toLocaleDateString()
                          : 'Never'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setActionMenu(actionMenu === member.id ? null : member.id)
                            }
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
                          >
                            <FaEllipsisV className="text-gray-600 dark:text-gray-400" />
                          </button>

                          {actionMenu === member.id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-xl border dark:border-gray-600 py-1 z-10">
                              <button
                                onClick={() => {
                                  setSelectedStaff(member);
                                  setShowPermissionsModal(true);
                                  setActionMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                              >
                                <FaShieldAlt /> Manage Permissions
                              </button>

                              {member.status === 'active' ? (
                                <button
                                  onClick={() => handleSuspendStaff(member.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                  <FaPause /> Suspend Staff
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateStaff(member.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                                >
                                  <FaPlay /> Activate Staff
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteStaff(member.id, member.fullName)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <FaTrash /> Delete Staff
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateStaffModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchStaff}
      />

      <EditPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
        onSuccess={fetchStaff}
      />
    </DashboardLayout>
  );
}