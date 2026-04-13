import React, { useState, useMemo, useEffect, useContext, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import { useMarketplace } from "../../context/MarketPlaceContext";
import LOgo from "../../images/me2sell-logo.png";
import EnyotronicsLogo from "../../images/enyotronics-logo.png";
import {
    FaSearch, FaWhatsapp, FaPhoneAlt, FaBars, FaMoon, FaSun,
    FaShoppingCart, FaTrash, FaPlus, FaMinus, FaTimes,
    FaMapMarkerAlt, FaFire, FaSortAmountDown, FaSortAmountUp,
    FaChevronDown, FaChevronRight, FaStore, FaTag, FaBox
} from "react-icons/fa";
import { MdKeyboardArrowDown, MdGridView, MdClose } from "react-icons/md";
import { auth } from "../../firebase/config";
import ProductImageCarousel from "../dashboard/ProductImageCarousel";

/* ─────────────────────────────────────────────────────────────────
   CART HELPERS — localStorage only, zero Firestore reads
───────────────────────────────────────────────────────────────── */
const CART_KEY = "marketplace_cart_v1";

const loadCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
};

const saveCart = (items) => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
    catch { /* storage full */ }
};

/* ─────────────────────────────────────────────────────────────────
   LOCATION HELPERS
───────────────────────────────────────────────────────────────── */
// Haversine distance in km between two lat/lng pairs
const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getUserLocation = () =>
    new Promise((res, rej) =>
        navigator.geolocation
            ? navigator.geolocation.getCurrentPosition(
                (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
                rej,
                { timeout: 8000 }
            )
            : rej(new Error("Geolocation not supported"))
    );

/* ─────────────────────────────────────────────────────────────────
   SORT OPTIONS
───────────────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
    { key: "default", label: "Relevance", icon: <FaSearch size={11} /> },
    { key: "price_asc", label: "Price: Low→High", icon: <FaSortAmountUp size={11} /> },
    { key: "price_desc", label: "Price: High→Low", icon: <FaSortAmountDown size={11} /> },
    { key: "popular", label: "Most Popular", icon: <FaFire size={11} /> },
    { key: "nearby", label: "Near Me", icon: <FaMapMarkerAlt size={11} /> },
];

/* ─────────────────────────────────────────────────────────────────
   MINI CART DRAWER
───────────────────────────────────────────────────────────────── */
function CartDrawer({ cart, onUpdate, onClose, onSelect }) {
    const remove = (e, id) => { e.stopPropagation(); onUpdate(cart.filter(i => i.id !== id)); };

    const handleItemClick = (item) => {
        onClose();           // slide cart away
        onSelect(item);      // open product modal — same as clicking the card
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FaShoppingCart className="text-green-600" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Your Cart</h2>
                    <span className="bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                    </span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                    <FaTimes className="text-gray-500" />
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                        <FaShoppingCart size={40} />
                        <p className="text-sm font-medium">Your cart is empty</p>
                    </div>
                ) : cart.map(item => (
                    <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        onClick={() => handleItemClick(item)}
                        className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 transition group"
                    >
                        {item.image ?
                            <img src={item.image} alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200"
                            />
                            :
                            <div className="flex justify-center pt-2">
                                <FaBox className="text-4xl text-gray-300" />
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-1 group-hover:text-green-600 transition-colors">
                                {item.name}
                            </p>
                            {item.businessName && (
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                    <FaStore size={8} /> {item.businessName}
                                </p>
                            )}
                            <p className="text-green-600 font-bold text-sm mt-1">
                                {item.currencySymbol}{item.sellingPrice?.toLocaleString()}
                            </p>
                            {item.location?.city && (
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                    <FaMapMarkerAlt size={8} className="text-green-600" /> {item.location.city}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={(e) => remove(e, item.id)}
                            className="self-start p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <FaTrash size={11} />
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
                <div className="px-4 py-4 border-t dark:border-gray-700">
                    <p className="text-xs text-center text-gray-400 mb-3">Tap a product to view details</p>
                    <button
                        onClick={() => onUpdate([])}
                        className="w-full py-2 text-sm text-red-500 hover:text-red-600 font-medium transition"
                    >
                        Clear Cart
                    </button>
                </div>
            )}
        </motion.div>
    );
}


/* ─────────────────────────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────────────────────────── */
function ProductCard({ product, imageIndex, onSelect, onAddToCart, inCart }) {
    const images = [product.image, product.image2].filter(Boolean);
    return (
        <motion.div
            layout
            whileHover={{ y: -3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
        >
            {/* Image */}
            <div className="relative overflow-hidden" onClick={() => onSelect(product)}>
                {product.image ?
                    <motion.img
                        key={imageIndex}
                        src={images[imageIndex] || images[0]}
                        alt={product.name}
                        className="w-full h-40 md:h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                    />
                    :
                    <div className="flex w-full h-40 md:h-44 object-cover justify-center pt-2">
                        <FaBox className="h-40 text-[120px] md:text-[150px] text-gray-200" />
                    </div>
                }
                {product.sold > 0 && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FaFire size={8} className="text-orange-400" /> {product.sold} sold
                    </div>
                )}
                {product.location?.city && (
                    <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FaMapMarkerAlt size={8} className="text-green-600" />
                        {product.location.city}
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="p-3" onClick={() => onSelect(product)}>
                <h4 className="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-100 line-clamp-1">
                    {product.name}
                </h4>
                {product.businessName && (
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <FaStore size={8} /> {product.businessName}
                    </p>
                )}
                <div className="flex gap-1 flex-wrap items-center justify-between mt-2">
                    <p className="text-green-600 font-bold md:text-base text-sm">
                        {product.currencySymbol}{product.sellingPrice.toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">{product.country}</p>
                </div>
            </div>

            {/* Add to cart */}
            <div className="px-3 pb-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2
                        ${inCart
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-600 hover:text-white"
                        }`}
                >
                    <FaShoppingCart size={10} />
                    {inCart ? "Added ✓" : "Add to Cart"}
                </button>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   PRODUCT DETAIL MODAL
───────────────────────────────────────────────────────────────── */
function ProductModal({ product, similarProducts, sellerProducts, cart, onAddToCart, onClose, onSelect }) {
    const inCart = cart.some(i => i.id === product.id);
    const modalScrollRef = useRef(null);

    useEffect(() => {
        modalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [product]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                ref={modalScrollRef}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 pr-4">
                        {product.name}
                    </h3>
                    <button onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition shrink-0">
                        <MdClose size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Left — image */}
                    <div className="p-4">
                        <ProductImageCarousel
                            images={[product.image, product.image2].filter(Boolean)}
                            imgHeight="60"
                        />

                        {similarProducts.length > 0 && (
                            <div className="mt-4 hidden md:block">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Similar Products</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {similarProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[120px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition">
                                            {item.image ?
                                                <img src={item.image} alt={item.name} className="w-full h-24 object-cover" />
                                                :
                                                <div className="flex justify-center pt-2">
                                                    <FaBox className="text-5xl text-gray-300" />
                                                </div>
                                            }
                                            <div className="p-2">
                                                <p className="text-xs font-medium line-clamp-1 dark:text-gray-300">{item.name}</p>
                                                <p className="text-xs font-bold text-green-600 mt-1">{item.currencySymbol}{item.sellingPrice?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right — details */}
                    <div className="p-4 space-y-4">
                        <div>
                            <p className="text-3xl font-black text-green-600">
                                {product.currencySymbol}{product.sellingPrice?.toLocaleString()}
                            </p>
                            {product.sold > 0 && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <FaFire className="text-orange-400" size={10} /> {product.sold} sold
                                </p>
                            )}
                        </div>

                        {product.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                {product.description}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                <p className="text-gray-400 text-xs">In Stock</p>
                                <p className="font-semibold text-gray-800 dark:text-white mt-0.5">{product.quantity}</p>
                            </div>
                            {product.location?.city && (
                                <div className="col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-green-600 shrink-0" size={12} />
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {[product.location.city, product.location.state, product.country].filter(Boolean).join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Seller info */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2">
                                <FaStore size={12} className="text-green-600" /> Seller
                            </h4>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{product.businessName || "—"}</p>
                            {product.businessType && <p className="text-xs text-gray-400">{product.businessType}</p>}
                            {product.address && <p className="text-xs text-gray-500 dark:text-gray-400">{product.address}</p>}

                            <div className="flex gap-2 pt-1">
                                <a href={`tel:${product.phone}`}
                                    className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition">
                                    <FaPhoneAlt size={12} /> Call
                                </a>
                                <a href={product.whatsappLink} target="_blank" rel="noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 text-sm font-medium transition">
                                    <FaWhatsapp size={14} /> WhatsApp
                                </a>
                            </div>
                        </div>

                        {/* Add to cart */}
                        <button
                            onClick={() => onAddToCart(product)}
                            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition
                                ${inCart ? "bg-green-600 text-white" : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-green-600 dark:hover:bg-green-600 dark:hover:text-white"}`}
                        >
                            <FaShoppingCart size={14} />
                            {inCart ? "Added to Cart ✓" : "Add to Cart"}
                        </button>

                        {/* More from seller */}
                        {sellerProducts.length > 0 && (
                            <div>
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">More from this seller</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {sellerProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition">
                                            {item.image ?
                                                <img src={item.image} alt={item.name} className="w-full h-20 object-cover" />
                                                :
                                                <div className="flex justify-center pt-2">
                                                    <FaBox className="text-5xl text-gray-300" />
                                                </div>
                                            }
                                            <div className="p-2">
                                                <p className="text-xs font-medium line-clamp-1 dark:text-gray-300">{item.name}</p>
                                                <p className="text-xs font-bold text-green-600 mt-1">{item.currencySymbol}{item.sellingPrice?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to={`/seller/${product.sellerId}`}
                                    className="inline-block mt-2 text-xs text-blue-600 hover:underline font-medium">
                                    View full store →
                                </Link>
                            </div>
                        )}

                        {/* Similar products mobile */}
                        {similarProducts.length > 0 && (
                            <div className="md:hidden">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Similar Products</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {similarProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition">
                                            {item.image ?
                                                <img src={item.image} alt={item.name} className="w-full h-20 object-cover" />
                                                :
                                                <div className="flex justify-center pt-2">
                                                    <FaBox className="text-5xl text-gray-300" />
                                                </div>
                                            }
                                            <div className="p-2">
                                                <p className="text-xs font-medium line-clamp-1 dark:text-gray-300">{item.name}</p>
                                                <p className="text-xs font-bold text-green-600 mt-1">{item.currencySymbol}{item.sellingPrice?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
const DESKTOP_NAV_COUNT = 8; // categories shown directly in desktop nav

export default function BuyerMarketplace({ categories = [] }) {
    const [user, setUser] = useState(null);
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [showMobileCategoryDropdown, setShowMobileCategoryDropdown] = useState(false);
    const [showAllCategoriesDropdown, setShowAllCategoriesDropdown] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [imageIndexes, setImageIndexes] = useState({});
    const imageTimersRef = useRef({});

    // Cart state — lives only in localStorage + React state
    const [cart, setCartState] = useState(loadCart);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const [showCart, setShowCart] = useState(false);

    // Sort / filter (only when searching)
    const [sortKey, setSortKey] = useState("default");
    const [userCoords, setUserCoords] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    const allCategoriesRef = useRef(null);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const {
        products,
        loading,
        fetchNextPage,
        hasMore,
        hasMoreSearch,
        activeCategory,
        setCategory,
        searchProducts,
        searchQuery,
        setSearchQuery,
        clearSearch,
        isSearching,
        MARKETPLACE_CATEGORIES,
        sellerResults,
    } = useMarketplace();

    // ── Auth ──────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = auth.onAuthStateChanged(u => setUser(u));
        return () => unsub();
    }, []);

    // ── Persist cart ──────────────────────────────────────────────
    const updateCart = useCallback((next) => {
        setCartState(next);
        saveCart(next);
    }, []);

    const addToCart = useCallback((product) => {
        setCartState(prev => {
            const exists = prev.find(i => i.id === product.id);
            const next = exists
                ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...product, qty: 1 }];
            saveCart(next);
            return next;
        });
    }, []);

    // ── Image slideshow ───────────────────────────────────────────
    useEffect(() => {
        products.forEach((product) => {
            const images = [product.image, product.image2].filter(Boolean);
            if (images.length <= 1 || imageTimersRef.current[product.id]) return;
            const delay = Math.floor(Math.random() * 10000) + 8000;
            imageTimersRef.current[product.id] = setInterval(() => {
                setImageIndexes(prev => ({
                    ...prev,
                    [product.id]: ((prev[product.id] || 0) + 1) % images.length,
                }));
            }, delay);
        });
        return () => {
            Object.entries(imageTimersRef.current).forEach(([id, t]) => {
                if (!products.find(p => p.id === id)) { clearInterval(t); delete imageTimersRef.current[id]; }
            });
        };
    }, [products]);

    // ── Close "all categories" dropdown on outside click ─────────
    useEffect(() => {
        const handler = (e) => {
            if (allCategoriesRef.current && !allCategoriesRef.current.contains(e.target)) {
                setShowAllCategoriesDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Location fetch for "Near Me" sort ────────────────────────
    const requestLocation = async () => {
        setLocationLoading(true);
        setLocationError("");
        try {
            const coords = await getUserLocation();
            setUserCoords(coords);
            setSortKey("nearby");
        } catch {
            setLocationError("Couldn't get your location. Please allow location access.");
            setSortKey("default");
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSortChange = (key) => {
        if (key === "nearby") { requestLocation(); return; }
        setSortKey(key);
    };

    // ── Sorted / filtered products ────────────────────────────────
    const displayedProducts = useMemo(() => {
        if (!isSearching) return Array.isArray(products) ? products : [];

        let list = [...(products || [])];
        switch (sortKey) {
            case "price_asc": list.sort((a, b) => a.sellingPrice - b.sellingPrice); break;
            case "price_desc": list.sort((a, b) => b.sellingPrice - a.sellingPrice); break;
            case "popular": list.sort((a, b) => (b.sold || 0) - (a.sold || 0)); break;
            case "nearby":
                if (userCoords) {
                    list = list.map(p => {
                        const pLat = p.location?.lat ?? p.location?.latitude;
                        const pLng = p.location?.lng ?? p.location?.longitude;
                        const dist = (pLat && pLng)
                            ? haversine(userCoords.lat, userCoords.lng, pLat, pLng)
                            : Infinity;
                        return { ...p, _dist: dist };
                    }).sort((a, b) => a._dist - b._dist);
                }
                break;
            default: break;
        }
        return list;
    }, [products, isSearching, sortKey, userCoords]);

    // ── Similar & seller products ─────────────────────────────────
    const sellerProducts = useMemo(() => {
        if (!selectedProduct) return [];
        return products.filter(p => p.sellerId === selectedProduct.sellerId && p.id !== selectedProduct.id);
    }, [products, selectedProduct]);

    const similarProducts = useMemo(() => {
        if (!selectedProduct || !products?.length) return [];
        const keywords = selectedProduct.name.toLowerCase().split(" ").filter(w => w.length > 2);
        return products.filter(p =>
            p.id !== selectedProduct.id &&
            keywords.some(kw => p.name.toLowerCase().includes(kw))
        );
    }, [selectedProduct, products]);

    // ── Nav derived data ──────────────────────────────────────────
    const navCategories = MARKETPLACE_CATEGORIES.slice(0, DESKTOP_NAV_COUNT);
    const overflowCategories = MARKETPLACE_CATEGORIES.slice(DESKTOP_NAV_COUNT);

    const activeCategoryLabel = useMemo(() => {
        const cat = MARKETPLACE_CATEGORIES.find(c => c.id === activeCategory);
        return cat?.name || "All Products";
    }, [activeCategory, MARKETPLACE_CATEGORIES]);

    const sectionTitle = useMemo(() => {
        if (isSearching) return `Results for "${searchQuery}"`;
        return activeCategoryLabel;
    }, [isSearching, searchQuery, activeCategoryLabel]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) { clearSearch(); return; }
        setSortKey("default");
        searchProducts({ queryText: searchQuery, reset: true });
    };

    const handleCategorySelect = (catId) => {
        setCategory(catId);
        setSearchQuery("");
        setSortKey("default");
        setShowAllCategoriesDropdown(false);
        setShowMobileDrawer(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

            {/* ── TOP NAVBAR ── */}
            <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="mx-auto px-3 py-10 md:px-6 h-14 flex items-center gap-2">

                    {/* Mobile hamburger */}
                    <button onClick={() => setShowMobileDrawer(true)}
                        className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <FaBars className="text-gray-600 dark:text-gray-300" />
                    </button>

                    {/* Logo */}
                    <Link to="/" className="shrink-0 hidden md:block">
                        <img src={LOgo} alt="Me2Sell" className="h-8 w-auto" />
                    </Link>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
                        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full pl-4 pr-1 py-1 focus-within:ring-2 focus-within:ring-green-500 transition">
                            <input
                                type="text"
                                placeholder="Search products, sellers, categories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 min-w-0"
                            />
                            <button type="submit" disabled={!searchQuery.trim()}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
                                <FaSearch size={12} />
                            </button>
                        </div>
                    </form>

                    {/* Right actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {user && (
                            <Link to="/dashboard"
                                className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-green-600 transition px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                                <MdGridView size={16} /> My Stock
                            </Link>
                        )}

                        {/* Cart button */}
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium"
                        >
                            <FaShoppingCart size={14} />
                            <span className="hidden sm:inline">Cart</span>
                            {cartCount > 0 && (
                                <motion.span
                                    key={cartCount}
                                    initial={{ scale: 1.4 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center"
                                >
                                    {cartCount}
                                </motion.span>
                            )}
                        </button>

                        {/* Theme toggle */}
                        <button onClick={toggleTheme}
                            className="hidden md:block p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                            {theme === "light"
                                ? <FaMoon className="text-gray-500" size={14} />
                                : <FaSun className="text-yellow-400" size={14} />
                            }
                        </button>
                    </div>
                </div>

                {/* ── DESKTOP CATEGORY NAV ── */}
                <div className="hidden md:block border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="max-w-7xl mx-auto px-6">
                        <ul className="flex flex-wrap items-center gap-1 text-sm">
                            {/* First 8 categories */}
                            {navCategories.map(cat => (
                                <li key={cat.id}>
                                    <button
                                        onClick={() => handleCategorySelect(cat.id)}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap text-xs
                                            ${activeCategory === cat.id
                                                ? "bg-green-600 text-white"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-green-600"
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                </li>
                            ))}

                            {/* "More" dropdown for remaining categories */}
                            {overflowCategories.length > 0 && (
                                <li ref={allCategoriesRef} className="relative ml-auto">
                                    <button
                                        onClick={() => setShowAllCategoriesDropdown(p => !p)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                        More <FaChevronDown size={9} className={`transition-transform ${showAllCategoriesDropdown ? "rotate-180" : ""}`} />
                                    </button>

                                    <AnimatePresence>
                                        {showAllCategoriesDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                className="absolute right-0 top-full mt-1 w-56 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-40"
                                            >
                                                {overflowCategories.map(cat => (
                                                    <button key={cat.id} onClick={() => handleCategorySelect(cat.id)}
                                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2
                                                            ${activeCategory === cat.id ? "text-green-600 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                                                        <FaChevronRight size={8} className="text-gray-300" />
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <main className="mx-auto px-5 md:px-6 py-3">

                {/* Section header + search sort filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{sectionTitle}</h2>
                    </div>

                    {/* Sort filters — only when searching */}
                    {isSearching && (
                        <div className="flex flex-wrap gap-1.5">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => handleSortChange(opt.key)}
                                    disabled={opt.key === "nearby" && locationLoading}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border
                                        ${sortKey === opt.key
                                            ? "bg-green-600 text-white border-green-600"
                                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:text-green-600"
                                        }`}
                                >
                                    {opt.key === "nearby" && locationLoading
                                        ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⊙</motion.span>
                                        : opt.icon
                                    }
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── SELLER SEARCH RESULTS ── */}
                {isSearching && sellerResults.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                            Stores matching "{searchQuery}"
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {sellerResults.map(seller => (
                                <Link
                                    key={seller.sellerId}
                                    to={`/seller/${seller.sellerId}`}
                                    className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-green-500 hover:shadow-md transition-all min-w-[200px]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shrink-0">
                                        <span className="text-white font-black">
                                            {seller.businessName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                                            {seller.businessName}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {seller.productCount} product{seller.productCount !== 1 ? "s" : ""}
                                            {seller.country ? ` · ${seller.country}` : ""}
                                        </p>
                                    </div>
                                    <FaChevronRight size={10} className="text-gray-300 ml-auto shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {locationError && (
                    <p className="text-xs text-red-500 mb-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{locationError}</p>
                )}

                {/* Loading */}
                {loading && products.length === 0 && (
                    <div className="flex items-center justify-center py-24">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent"
                        />
                    </div>
                )}

                {/* Empty */}
                {!loading && displayedProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                        <FaSearch size={32} />
                        <p className="font-medium">{isSearching ? "No results found" : "No products yet"}</p>
                        {isSearching && (
                            <button onClick={() => { clearSearch(); setSortKey("default"); }}
                                className="text-sm text-green-600 hover:underline">Clear search</button>
                        )}
                    </div>
                )}

                {/* Product grid */}
                {displayedProducts.length > 0 && (
                    <motion.div
                        layout={false}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {displayedProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    imageIndex={imageIndexes[product.id] || 0}
                                    onSelect={setSelectedProduct}
                                    onAddToCart={addToCart}
                                    inCart={cart.some(i => i.id === product.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Load more */}
                {!loading && (isSearching ? hasMoreSearch : hasMore) && (
                    <div className="flex justify-center mt-8">
                        <button onClick={fetchNextPage} disabled={loading}
                            className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-green-600 hover:text-white hover:border-green-600 font-semibold text-sm transition shadow-sm">
                            Load More
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 mt-12 py-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Powered by</p>
                    <Link to="/enyotronics">
                        <img src={EnyotronicsLogo} alt="Enyotronics" className="w-20" />
                    </Link>
                </div>
            </main>

            {/* ── MOBILE DRAWER ── */}
            <AnimatePresence>
                {showMobileDrawer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={() => setShowMobileDrawer(false)}
                    >
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-72 h-full bg-white dark:bg-gray-900 flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                                <Link to="/">
                                    <img src={LOgo} alt="logo" className="w-24" />
                                </Link>
                                <div className="flex items-center gap-2">
                                    <button onClick={toggleTheme}
                                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                                        {theme === "light" ? <FaMoon size={12} className="text-gray-600" /> : <FaSun size={12} className="text-yellow-400" />}
                                    </button>
                                    <button onClick={() => setShowMobileDrawer(false)}
                                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                                        <FaTimes size={12} className="text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {/* Categories */}
                                <button
                                    onClick={() => setShowMobileCategoryDropdown(p => !p)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Categories</span>
                                    <FaChevronDown size={10} className={`text-gray-400 transition-transform ${showMobileCategoryDropdown ? "rotate-180" : ""}`} />
                                </button>

                                {showMobileCategoryDropdown && (
                                    <ul className="ml-2 space-y-0.5 max-h-64 overflow-y-auto">
                                        {MARKETPLACE_CATEGORIES.map(cat => (
                                            <li key={cat.id}>
                                                <button
                                                    onClick={() => handleCategorySelect(cat.id)}
                                                    className={`w-full text-left px-4 py-2 rounded-xl text-sm transition
                                                        ${activeCategory === cat.id
                                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold"
                                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        }`}
                                                >
                                                    {cat.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {user && (
                                    <Link to="/dashboard"
                                        onClick={() => setShowMobileDrawer(false)}
                                        className="flex items-center gap-2 w-full p-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <MdGridView size={16} /> My Seller Account
                                    </Link>
                                )}
                            </div>

                            <div className="p-4 border-t dark:border-gray-800 flex items-center justify-center gap-2">
                                <p className="text-xs text-gray-400">Powered by</p>
                                <img src={EnyotronicsLogo} alt="Enyotronics" className="w-16" />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CART DRAWER ── */}
            <AnimatePresence>
                {showCart && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50"
                            onClick={() => setShowCart(false)}
                        />
                        <CartDrawer
                            cart={cart}
                            onUpdate={updateCart}
                            onClose={() => setShowCart(false)}
                            onSelect={(p) => { setShowCart(false); setSelectedProduct(p); }}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* ── PRODUCT MODAL ── */}
            <AnimatePresence>
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        similarProducts={similarProducts}
                        sellerProducts={sellerProducts}
                        cart={cart}
                        onAddToCart={addToCart}
                        onClose={() => setSelectedProduct(null)}
                        onSelect={setSelectedProduct}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}