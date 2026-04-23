// src/pages/staff/StaffDashboardLayout.jsx
import React, { useState, useContext, useEffect } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { usePermissions } from "../../hooks/usePermissions";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import Logo from "../../images/me2sell-logo.png";
import EnyotronicsLogo from "../../images/enyotronics-logo.png";
import SearchBar from "../dashboard/SearchBar";
import { MdSell } from "react-icons/md";
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
    FaTimes,
    FaChartLine,
    FaIdBadge,
} from "react-icons/fa";

export default function StaffDashboardLayout({ children }) {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { cartItems } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [staffInfo, setStaffInfo] = useState({
        name: "",
        role: "",
        businessName: "",
    });

    const { logout } = useContext(AuthContext);
    const { permissions, isStaff } = usePermissions();



    // Load staff info
    useEffect(() => {
        const loadStaffInfo = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                // Get staff profile
                const staffDoc = await getDoc(doc(db, "staff", user.uid));
                if (staffDoc.exists()) {
                    const staffData = staffDoc.data();
                    
                    // Get business name from owner's profile
                    const businessDoc = await getDoc(doc(db, "businessProfiles", staffData.businessId));
                    const businessName = businessDoc.exists() 
                        ? businessDoc.data()?.business?.businessName || "Business"
                        : "Business";

                    setStaffInfo({
                        name: staffData.fullName || user.displayName || "Staff Member",
                        role: staffData.role || "staff",
                        businessName: businessName,
                    });
 
                    // Cache for faster loading
                    localStorage.setItem(`staff_info_${user.uid}`, JSON.stringify({
                        name: staffData.fullName,
                        role: staffData.role,
                        businessName: businessName,
                    }));
                }
            } catch (error) {
                console.error("Error loading staff info:", error);
            }
        };

        // Try cache first
        const user = auth.currentUser;
        if (user) {
            const cached = localStorage.getItem(`staff_info_${user.uid}`);
            if (cached) {
                setStaffInfo(JSON.parse(cached));
            }
        }

        loadStaffInfo();
    }, []);

    // Build nav items based on permissions
    const getNavItems = () => {
        const baseItems = [
            { to: "/staff/dashboard", icon: <FaHome />, label: "Home" },
            { to: "/staff/products", icon: <FaBox />, label: "Products" },
            { to: "/staff/cart", icon: <FaShoppingCart />, label: "Cart" },
            { to: "/staff/sales-history", icon: <FaHistory />, label: "Sales History" },
            { to: "/marketplace", icon: <MdSell />, label: "Marketplace" },
        ];

        return baseItems;
    };

    const navItems = getNavItems();
    const totalItemsInCart = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const formatRole = (role) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed top-0 h-full w-64 bg-gradient-to-b from-blue-600 to-indigo-700 shadow-xl flex-col p-4 z-50">
                <Link to="/" className="mb-8 mt-2">
                    <img src={Logo} alt="Me2sell Logo" className="w-20 mx-auto hover:scale-105 transition" />
                </Link>

                {/* Staff Badge */}
                <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <FaIdBadge className="text-white text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">
                                {staffInfo.name}
                            </p>
                            <p className="text-blue-200 text-xs truncate">
                                {formatRole(staffInfo.role)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-blue-100 text-xs truncate">
                            {staffInfo.businessName}
                        </span>
                    </div>
                </div>

                <nav className="flex flex-col gap-2 relative flex-1 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.to;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    isActive 
                                        ? "text-blue-900 font-semibold bg-white shadow-lg" 
                                        : "text-white hover:bg-white/10"
                                }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-4 border-t border-white/20 space-y-2">
                    <button
                        onClick={logout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-600 to-indigo-700 shadow-2xl p-4 flex flex-col z-50 lg:hidden"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <Link to="/" onClick={() => setOpen(false)}>
                                    <img src={Logo} alt="Me2sell Logo" className="w-16" />
                                </Link>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition"
                                >
                                    <FaTimes className="text-white" />
                                </button>
                            </div>

                            {/* Staff Badge - Mobile */}
                            <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <FaIdBadge className="text-white text-lg" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">
                                            {staffInfo.name}
                                        </p>
                                        <p className="text-blue-200 text-xs truncate">
                                            {formatRole(staffInfo.role)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-blue-100 text-xs truncate">
                                        {staffInfo.businessName}
                                    </span>
                                </div>
                            </div>

                            <nav className="flex flex-col gap-2 relative flex-1 overflow-y-auto">
                                {navItems.map(item => {
                                    const isActive = location.pathname === item.to;
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setOpen(false)}
                                            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                isActive 
                                                    ? "text-blue-900 font-semibold bg-white shadow-lg" 
                                                    : "text-white"
                                            }`}
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-auto pt-4 border-t border-white/20">
                                <button
                                    onClick={logout}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition"
                                >
                                    <FaSignOutAlt /> Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4">
                        {/* Left Section */}
                        <div className="flex items-center gap-3 lg:gap-4">
                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setOpen(!open)}
                                className="p-2 lg:hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition"
                            >
                                <FaBars />
                            </button>

                            {/* Staff Badge - Desktop Header */}
                            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                                <FaIdBadge className="text-blue-600 dark:text-blue-400" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                        {staffInfo.name}
                                    </span>
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                        {formatRole(staffInfo.role)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-2 lg:gap-4">
                            {/* Cart Icon */}
                            <Link 
                                to="/staff/cart" 
                                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                            >
                                <FaShoppingCart className="text-xl text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                                {totalItemsInCart > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                                        {totalItemsInCart}
                                    </span>
                                )}
                            </Link>

                            {/* Theme Toggle */}
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

                    {/* Mobile Staff Info */}
                    <div className="lg:hidden px-4 pb-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <FaIdBadge className="text-blue-600 dark:text-blue-400" />
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 truncate">
                                    {staffInfo.name}
                                </span>
                                <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                    {formatRole(staffInfo.role)} • {staffInfo.businessName}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="p-4 lg:p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </main>

                {/* Footer */}
                <footer className="py-4 px-4 lg:px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
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
        </div>
    );
}