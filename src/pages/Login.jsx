import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import ThemeToggle from '../components/ThemeToggle';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSpinner, FaShieldAlt } from 'react-icons/fa';
import Logo from '../images/me2sell-logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setErrorMsg('');
    setShowPass(false);
  };

  const handleFirebaseError = (err) => {
    const message = err.message || '';
    const code = err.code || '';
    const extracted = message.match(/\(auth\/[a-z\-]+\)/);
    const actualCode = extracted ? extracted[0].replace(/[()]/g, '') : code;

    switch (actualCode) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Try again.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait and try again.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      default:
        return 'Login failed. Please try again.';
    }
  };

  // ✅ ADMIN LOGIN - WITH ROLE VERIFICATION
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) return setErrorMsg('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email)) return setErrorMsg('Enter a valid email address.');
    if (!password.trim()) return setErrorMsg('Password is required.');
    if (password.length < 6) return setErrorMsg('Password must be at least 6 characters long.');

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔥 CHECK IF USER HAS BUSINESS PROFILE (is admin)
      const businessProfileDoc = await getDoc(doc(db, 'businessProfiles', user.uid));

      if (!businessProfileDoc.exists()) {
        // Not an admin - check if they're staff
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists() && userDoc.data().role === 'staff') {
          await auth.signOut();
          setErrorMsg('This is a staff account. Please use the Staff login tab.');
          return;
        }

        // Neither admin nor staff
        await auth.signOut();
        setErrorMsg('Admin account not found. Please register as an admin first.');
        return;
      }

      // 🔥 ENSURE USER DOCUMENT HAS ADMIN ROLE
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If user document exists but role is 'staff', reject
        if (userData.role === 'staff') {
          await auth.signOut();
          setErrorMsg('This is a staff account. Please use the Staff login tab.');
          return;
        }

        // Update role to admin if not set
        if (!userData.role || userData.role !== 'admin') {
          await updateDoc(doc(db, 'users', user.uid), {
            role: 'admin',
            lastLogin: serverTimestamp(),
          });
        } else {
          // Just update last login
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: serverTimestamp(),
          });
        }
      } else {
        // Create user document with admin role
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: 'admin',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }

      // Cache role
      localStorage.setItem('userRole', 'admin');

      // Navigate to admin dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMsg(handleFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // ✅ STAFF LOGIN - WITH ROLE VERIFICATION
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) return setErrorMsg('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email)) return setErrorMsg('Enter a valid email address.');
    if (!password.trim()) return setErrorMsg('Password is required.');

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔥 CHECK IF USER DOCUMENT EXISTS
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        await auth.signOut();
        setErrorMsg('Account not found. Please contact your administrator.');
        return;
      }

      const userData = userDoc.data();

      // 🔥 CHECK IF THIS IS AN ADMIN ACCOUNT
      if (userData.role === 'admin' || !userData.role) {
        // Check if they have a business profile (definitely admin)
        const businessProfileDoc = await getDoc(doc(db, 'businessProfiles', user.uid));
        
        if (businessProfileDoc.exists()) {
          await auth.signOut();
          setErrorMsg('This is an admin account. Please use the Admin login tab.');
          return;
        }
      }

      // 🔥 VERIFY ROLE IS STAFF
      if (userData.role !== 'staff') {
        await auth.signOut();
        setErrorMsg('This login is for staff only. Admins should use the Admin tab.');
        return;
      }

      // 🔥 VERIFY STAFF PROFILE EXISTS
      const staffDoc = await getDoc(doc(db, 'staff', user.uid));
      
      if (!staffDoc.exists()) {
        await auth.signOut();
        setErrorMsg('Staff profile not found. Please contact your administrator.');
        return;
      }

      const staffData = staffDoc.data();

      // 🔥 CHECK ACCOUNT STATUS
      if (staffData.status !== 'active') {
        await auth.signOut();
        setErrorMsg(`Your account is ${staffData.status}. Please contact your administrator.`);
        return;
      }

      // ✅ UPDATE LAST LOGIN
      await updateDoc(doc(db, 'staff', user.uid), { lastLogin: serverTimestamp() });
      await updateDoc(doc(db, 'users', user.uid), { lastLogin: serverTimestamp() });

      // ✅ CACHE STAFF INFO
      localStorage.setItem('userRole', 'staff');
      localStorage.setItem('staffPermissions', JSON.stringify(staffData.permissions));
      localStorage.setItem('staffName', staffData.fullName);

      // ✅ NAVIGATE TO STAFF DASHBOARD
      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      console.error('Staff login error:', err);
      setErrorMsg(handleFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = activeTab === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Logo */}
        <div className="flex justify-center pt-8 pb-4">
          <img src={Logo} alt="Logo" className="w-24 hover:scale-105 transition" />
        </div>

        {/* Tab switcher */}
        <div className="flex mx-6 mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          <button
            onClick={() => switchTab('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isAdmin
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <FaShieldAlt className={isAdmin ? 'text-blue-600 dark:text-blue-400' : ''} />
            Admin
          </button>

          <button
            onClick={() => switchTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !isAdmin
                ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <FaUser className={!isAdmin ? 'text-purple-600 dark:text-purple-400' : ''} />
            Staff
          </button>
        </div>

        {/* Card body */}
        <div className="px-8 pb-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
            {isAdmin ? 'Admin Login' : 'Staff Login'}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">
            {isAdmin
              ? 'Sign in to your admin dashboard'
              : 'Sign in to your staff account'}
          </p>

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isAdmin ? handleAdminLogin : handleStaffLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdmin ? 'admin@example.com' : 'staff@example.com'}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition"
                />
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition"
                />
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 shadow-lg ${
                isAdmin
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  {isAdmin ? <FaShieldAlt /> : <FaUser />}
                  Sign In as {isAdmin ? 'Admin' : 'Staff'}
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 space-y-3 text-center">
            {isAdmin && (
              <Link
                to="/forgot-password"
                className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </Link>
            )}

            {isAdmin ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Register as Admin
                </Link>
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                👤 Staff accounts are created by your administrator.
                <br />
                Need help? Contact your admin.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}