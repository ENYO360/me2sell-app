import React, { useState, useContext, useEffect } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useNotification } from "../../context/NotificationContext";
import { useMyLocation } from "../../hooks/useLocation";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { HiBuildingOffice2 } from "react-icons/hi2";
import { BiSolidCategoryAlt } from "react-icons/bi";
import { IoNotifications } from "react-icons/io5";
import { MdSell } from "react-icons/md";
import Logo from "../../images/me2sell-logo.png";
import EnyotronicsLogo from "../../images/enyotronics-logo.png";
import SearchBar from "./SearchBar";
import LocationPermissionModal from "../../components/LocationPermissionModal";
import {
    FaBars,
    FaHome,
    FaBox,
    FaShoppingCart,
    FaHistory,
    FaSignOutAlt,
    FaSun,
    FaMoon,
    FaUserTie,
    FaUsers,
    FaTimes,
} from "react-icons/fa";

export default function DashboardLayout({ children }) {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { cartItems } = useCart();
    const { unreadCount } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const { updateLocation } = useMyLocation();
    const [open, setOpen] = useState(false);
    const [businessName, setBusinessName] = useState("");
    const [locationUpdating, setLocationUpdating] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);

    const { logout } = useContext(AuthContext);

    const navItems = [
        { to: "/dashboard", icon: <FaHome />, label: "Home" },
        { to: "/dashboard/overview", icon: <FaHome />, label: "Overview" },
        { to: "/dashboard/products", icon: <FaBox />, label: "Products" },
        { to: "/dashboard/cart", icon: <FaShoppingCart />, label: "Cart" },
        { to: "/dashboard/sales-history", icon: <FaHistory />, label: "Sales History" },
        { to: "/dashboard/departments", icon: <HiBuildingOffice2 />, label: "Departments" },
        { to: "/dashboard/categories", icon: <BiSolidCategoryAlt />, label: "Categories" },
        { to: "/dashboard/profile", icon: <FaUserTie />, label: "Profile" },
        { to: "/dashboard/staff", icon: <FaUsers />, label: "Staff" },
        { to: "/marketplace", icon: <MdSell />, label: "Marketplace" }
    ];

    // Load business name
    useEffect(() => {
        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                localStorage.removeItem("businessName");
                setBusinessName("");
                return;
            }

            const ref = doc(db, "businessProfiles", user.uid);

            unsubscribeProfile = onSnapshot(ref, (snap) => {
                if (snap.exists()) {
                    const name = snap.data()?.business?.businessName ?? "My Business";
                    setBusinessName(name);
                    localStorage.setItem("businessName", name);
                }
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    // Check if location needs updating
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;

            // ✅ Check if user already dismissed the modal this session
            // Key is per-user and expires after 24 hours
            const dismissKey = `location_modal_dismissed_${user.uid}`;
            const dismissedAt = sessionStorage.getItem(dismissKey);

            if (dismissedAt) {
                const twentyFourHours = 24 * 60 * 60 * 1000;
                const elapsed = Date.now() - parseInt(dismissedAt);
                if (elapsed < twentyFourHours) return; // ✅ Still within grace period
                sessionStorage.removeItem(dismissKey); // Expired — allow check again
            }

            try {
                // ✅ Check browser permission first — skip entirely if denied
                if ("permissions" in navigator) {
                    const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
                    if (permissionStatus.state === "denied") return;
                }

                const profileRef = doc(db, "businessProfiles", user.uid);
                const profileSnap = await getDoc(profileRef);

                // No profile or no stored location — prompt user
                if (!profileSnap.exists()) {
                    setShowLocationModal(true);
                    return;
                }

                const storedLocation = profileSnap.data()?.business?.location;

                if (!storedLocation?.latitude || !storedLocation?.longitude) {
                    setShowLocationModal(true);
                    return;
                }

                // Check if last update was more than 30 days ago
                const lastTimestamp = storedLocation?.timestamp?.toMillis?.() || 0;
                const thirtyDays = 30 * 24 * 60 * 60 * 1000;
                const isOlderThanMonth = Date.now() - lastTimestamp > thirtyDays;

                if (!isOlderThanMonth) return; // Fresh enough — do nothing

                // 30+ days old — get current GPS and compare against Firestore
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;

                        const coordsChanged =
                            Math.abs(latitude - storedLocation.latitude) > 0.05 ||
                            Math.abs(longitude - storedLocation.longitude) > 0.05;

                        if (coordsChanged) {
                            setShowLocationModal(true);
                        } else {
                            // Same location — silently refresh timestamp
                            await updateLocation();
                        }
                    },
                    (error) => {
                        // Only show modal for non-denial errors
                        if (error.code !== error.PERMISSION_DENIED) {
                            setShowLocationModal(true);
                        }
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
                );

            } catch (error) {
                console.error("Failed to check location status:", error);
            }
        });

        return () => unsubscribe();
    }, [updateLocation]);

    // ✅ When user dismisses modal — record the time in sessionStorage
    const handleLocationModalClose = () => {
        const user = auth.currentUser;
        if (user) {
            sessionStorage.setItem(
                `location_modal_dismissed_${user.uid}`,
                Date.now().toString()
            );
        }
        setShowLocationModal(false);
    };

    const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 transition-colors">

            {/* =========================== */}
            {/* Desktop Sidebar */}
            {/* =========================== */}
            <aside className="hidden lg:flex fixed top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex-col p-4 z-50">
                <Link to="/" className="mb-8 mt-2">
                    <img src={Logo} alt="Me2sell Logo" className="w-20 mx-auto hover:scale-105 transition" />
                </Link>

                <nav className="flex flex-col gap-2 relative flex-1 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.to;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? "text-white font-semibold"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                <span className="relative z-10 text-lg">{item.icon}</span>
                                <span className="relative z-10 text-sm">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeLink"
                                        className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <Link
                        to="/how-it-works"
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                    >
                        📚 How it Works
                    </Link>
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </aside>

            {/* =========================== */}
            {/* Mobile Sidebar */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-2xl p-4 flex flex-col z-50 lg:hidden"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <Link to="/" onClick={() => setOpen(false)}>
                                    <img src={Logo} alt="Me2sell Logo" className="w-16" />
                                </Link>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    <FaTimes className="text-gray-700 dark:text-gray-200" />
                                </button>
                            </div>

                            <nav className="flex flex-col gap-2 relative flex-1 overflow-y-auto">
                                {navItems.map(item => {
                                    const isActive = location.pathname === item.to;
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setOpen(false)}
                                            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                                ? "text-white font-semibold"
                                                : "text-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            <span className="relative z-10 text-lg">{item.icon}</span>
                                            <span className="relative z-10">{item.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeLinkMobile"
                                                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl"
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <Link
                                    to="/how-it-works"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                                >
                                    📚 How it Works
                                </Link>
                                <button
                                    onClick={logout}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                >
                                    <FaSignOutAlt /> Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* =========================== */}
            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-3 lg:gap-4">
                            <button
                                onClick={() => setOpen(!open)}
                                className="p-2 lg:hidden rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                <FaBars className="text-gray-700 dark:text-gray-200" />
                            </button>

                            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate max-w-[200px]">
                                    {businessName || "Loading..."}
                                </span>
                            </div>
                        </div>

                        <div className="hidden lg:flex flex-1 max-w-2xl mx-4">
                            <SearchBar />
                        </div>

                        <div className="flex items-center gap-2 lg:gap-4">
                            <Link
                                to="/dashboard/cart"
                                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                            >
                                <FaShoppingCart className="text-xl text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                                {totalItemsInCart > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                                        {totalItemsInCart}
                                    </span>
                                )}
                            </Link>

                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                                {theme === "light" ? (
                                    <FaMoon className="text-gray-700" />
                                ) : (
                                    <FaSun className="text-yellow-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="lg:hidden px-4 pb-3">
                        <SearchBar />
                    </div>

                    <div className="lg:hidden px-4 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">
                                {businessName || "Loading..."}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="p-4 lg:p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </main>

                <footer className="py-4 px-4 lg:px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex flex-row items-center justify-center gap-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Powered by:
                        </p>
                        <Link to="/enyotronics" className="hover:opacity-80 transition">
                            <img
                                src={EnyotronicsLogo}
                                alt="Enyotronics logo"
                                className="w-24"
                            />
                        </Link>
                    </div>
                </footer>
            </div>

            {/* ✅ handleLocationModalClose records dismissal before closing */}
            <LocationPermissionModal
                isOpen={showLocationModal}
                onClose={handleLocationModalClose}
                onSuccess={() => {
                    handleLocationModalClose();
                    console.log("Location enabled!");
                }}
            />
        </div>
    );
}