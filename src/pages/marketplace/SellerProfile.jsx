import React, { useMemo, useState, useContext, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import { useMarketplace } from "../../context/MarketPlaceContext";
import ProductImageCarousel from "../dashboard/ProductImageCarousel";
import { auth } from "../../firebase/config";
import {
    FaSearch, FaWhatsapp, FaPhoneAlt, FaMoon, FaSun,
    FaStore, FaMapMarkerAlt, FaTag, FaFire,
    FaArrowLeft, FaShoppingCart, FaTrash, FaTimes, FaBox,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import LOgo from "../../images/me2sell-logo.png";

/* ─────────────────────────────────────────────────────────────────
   CART — shared localStorage key with BuyerMarketplace so items
   added here appear in the main marketplace cart and vice versa
───────────────────────────────────────────────────────────────── */
const CART_KEY = "marketplace_cart_v1";
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = (items) => { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { } };

/* ─────────────────────────────────────────────────────────────────
   CART DRAWER
───────────────────────────────────────────────────────────────── */
function CartDrawer({ cart, onUpdate, onClose, onSelect }) {
    const remove = (e, id) => { e.stopPropagation(); onUpdate(cart.filter(i => i.id !== id)); };

    const handleItemClick = (item) => {
        onClose();
        onSelect(item);
    };

    return (
        <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FaShoppingCart className="text-green-600" />
                    <h2 className="font-bold text-gray-900 dark:text-white text-lg">Cart</h2>
                    <span className="bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                    </span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                    <FaTimes className="text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                        <FaShoppingCart size={40} />
                        <p className="text-sm font-medium">Cart is empty</p>
                    </div>
                ) : cart.map(item => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleItemClick(item)}
                        className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 transition group">
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
                            <p className="text-green-600 font-bold text-sm mt-1">
                                {item.currencySymbol}{item.sellingPrice?.toLocaleString()}
                            </p>
                        </div>
                        <button onClick={(e) => remove(e, item.id)}
                            className="self-start p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <FaTrash size={11} />
                        </button>
                    </motion.div>
                ))}
            </div>

            {cart.length > 0 && (
                <div className="px-4 py-4 border-t dark:border-gray-700">
                    <p className="text-xs text-center text-gray-400 mb-3">Tap a product to view details</p>
                    <button onClick={() => onUpdate([])} className="w-full py-2 text-sm text-red-500 hover:text-red-600 font-medium transition">
                        Clear Cart
                    </button>
                </div>
            )}
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   PRODUCT CARD — identical to BuyerMarketplace
───────────────────────────────────────────────────────────────── */
function ProductCard({ product, imageIndex, onSelect, onAddToCart, inCart }) {
    const images = [product.image, product.image2].filter(Boolean);
    return (
        <motion.div
            layout
            whileHover={{ y: -3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
        >
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

            <div className="p-3" onClick={() => onSelect(product)}>
                <h4 className="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-100 line-clamp-1">
                    {product.name}
                </h4>
                {product.businessName && (
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <FaStore size={8} /> {product.businessName}
                    </p>
                )}
                <div className="flex items-center justify-between mt-2">
                    <p className="text-green-600 font-bold md:text-base text-sm">
                        {product.currencySymbol}{product.sellingPrice?.toLocaleString()}
                    </p>
                </div>
            </div>

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
   PRODUCT MODAL — identical layout to BuyerMarketplace.
   Uses local imgIndex state + <motion.img> to guarantee images
   always render (avoids dynamic Tailwind class purge issues).
───────────────────────────────────────────────────────────────── */
function ProductModal({ product, storeProducts, cart, onAddToCart, onClose, onSelect }) {
    const inCart = cart.some(i => i.id === product.id);
    const modalScrollRef = useRef(null);
    const images = [product.image, product.image2].filter(Boolean);
    const [imgIndex, setImgIndex] = useState(0);

    useEffect(() => {
        setImgIndex(0);
        modalScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, [product]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 pr-4">{product.name}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition shrink-0">
                        <FaTimes size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Left — image */}
                    <div className="p-4">
                        <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                            {product.image ?
                                <ProductImageCarousel
                                    images={[product.image, product.image2].filter(Boolean)}
                                    imgHeight="60"
                                />
                                :
                                <div className="flex w-full h-40 md:h-44 object-cover justify-center pt-2">
                                    <FaBox className="h-40 text-[120px] md:text-[150px] text-gray-200" />
                                </div>
                            }

                        </div>

                        {/* More from store — desktop left column */}
                        {storeProducts.length > 0 && (
                            <div className="mt-4 hidden md:block">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">More from this store</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {storeProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition shrink-0">
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
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{product.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                <p className="text-gray-400 text-xs">Category</p>
                                <p className="font-semibold text-gray-800 dark:text-white mt-0.5 flex items-center gap-1">
                                    <FaTag size={10} className="text-green-600" /> {product.categoryId || "—"}
                                </p>
                            </div>
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

                        {/* More from store — mobile */}
                        {storeProducts.length > 0 && (
                            <div className="md:hidden">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">More from this store</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {storeProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition shrink-0">
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
   MAIN
───────────────────────────────────────────────────────────────── */
export default function SellerProfile() {
    const { sellerId } = useParams();

    // ✅ Pull directly from MarketplaceContext — zero extra Firestore reads.
    // The context already has all marketplace products in memory with every
    // seller field embedded (businessName, phone, address, whatsappLink, etc.)
    // written by the cloud function at publish time.
    const { products: allProducts, loading: marketplaceLoading } = useMarketplace();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cart, setCartState] = useState(loadCart);
    const [showCart, setShowCart] = useState(false);
    const [user, setUser] = useState(null);
    const [imageIndexes, setImageIndexes] = useState({});
    const imageTimersRef = useRef({});

    const { theme, toggleTheme } = useContext(ThemeContext);
    const cartCount = cart.length;

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(setUser);
        return unsub;
    }, []);

    // ── Cart helpers ─────────────────────────────────────────────
    const updateCart = (next) => { setCartState(next); saveCart(next); };

    const addToCart = (product) => {
        setCartState(prev => {
            const exists = prev.find(i => i.id === product.id);
            const next = exists
                ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...product, qty: 1 }];
            saveCart(next);
            return next;
        });
    };

    // ── Filter this seller's products from the context ───────────
    // sellerId on every marketplaceProduct doc = uid from cloud function path
    // products/{uid}/productList/{productId}  →  sellerId: uid
    const sellerProducts = useMemo(
        () => allProducts.filter(p => p.sellerId === sellerId),
        [allProducts, sellerId]
    );

    // ── Seller info — read from first matching product ───────────
    // Cloud function writes: businessName, businessType, phone,
    // address, country, currencySymbol, whatsappLink onto every doc
    const seller = sellerProducts[0] ?? null;

    // ── Search filter ────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return sellerProducts;
        const q = searchQuery.toLowerCase();
        return sellerProducts.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.categoryId?.toLowerCase().includes(q) ||
            p.department?.toLowerCase().includes(q)
        );
    }, [sellerProducts, searchQuery]);

    // ── Image slideshow — same logic as BuyerMarketplace ─────────
    useEffect(() => {
        filteredProducts.forEach((product) => {
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
                if (!filteredProducts.find(p => p.id === id)) {
                    clearInterval(t);
                    delete imageTimersRef.current[id];
                }
            });
        };
    }, [filteredProducts]);

    // ── Products shown in modal's "More from store" strip ────────
    const storeProducts = useMemo(
        () => selectedProduct ? sellerProducts.filter(p => p.id !== selectedProduct.id) : [],
        [sellerProducts, selectedProduct]
    );

    // ── Loading — wait for marketplace context to hydrate ────────
    if (marketplaceLoading && allProducts.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent"
                />
            </div>
        );
    }

    // ── Seller not found ─────────────────────────────────────────
    if (!marketplaceLoading && sellerProducts.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-3 text-gray-400">
                <FaStore size={40} />
                <p className="font-semibold">Store not found</p>
                <p className="text-sm text-center max-w-xs">
                    This seller has no published products, or their products haven't loaded yet.
                </p>
                <Link to="/marketplace" className="mt-2 text-sm text-green-600 hover:underline">
                    ← Back to Marketplace
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

            {/* ── HEADER ── */}
            <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

                    <Link to="/marketplace"
                        className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 transition shrink-0">
                        <FaArrowLeft size={12} />
                    </Link>

                    <Link to="/" className="shrink-0">
                        <img src={LOgo} alt="Me2Sell" className="h-7 w-auto" />
                    </Link>

                    {/* Search */}
                    <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-green-500 transition">
                        <FaSearch className="text-gray-400 mr-2 shrink-0" size={12} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search this store..."
                            className="bg-transparent dark:text-gray-300 w-full outline-none text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 ml-1">
                                <FaTimes size={10} />
                            </button>
                        )}
                    </div>

                    {/* Cart */}
                    <button onClick={() => setShowCart(true)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition text-sm font-medium shrink-0">
                        <FaShoppingCart size={13} />
                        <span className="hidden sm:inline">Cart</span>
                        {cartCount > 0 && (
                            <motion.span key={cartCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                {cartCount}
                            </motion.span>
                        )}
                    </button>

                    <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition shrink-0">
                        {theme === "light"
                            ? <FaMoon size={13} className="text-gray-500" />
                            : <FaSun size={13} className="text-yellow-400" />
                        }
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── SELLER BANNER ── */}
                {seller && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                    <FaStore className="text-green-600" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {seller.businessName || "This Store"}
                                    </h1>
                                    {seller.businessType && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{seller.businessType}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                                        {(seller.address || seller.country) && (
                                            <span className="flex items-center gap-1">
                                                <FaMapMarkerAlt size={9} className="text-green-600" />
                                                {[seller.address, seller.country].filter(Boolean).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {seller.phone && (
                                    <a href={`tel:${seller.phone}`}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <FaPhoneAlt size={11} /> Call
                                    </a>
                                )}
                                {seller.whatsappLink && (
                                    <a href={seller.whatsappLink} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition">
                                        <FaWhatsapp size={13} /> WhatsApp
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PRODUCTS ── */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        Products
                    </h2>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                        <FaSearch size={28} />
                        <p className="text-sm font-medium">No products match your search</p>
                        <button onClick={() => setSearchQuery("")} className="text-xs text-green-600 hover:underline">
                            Clear search
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProducts.map(product => (
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
                    </div>
                )}
            </div>

            {/* ── CART DRAWER ── */}
            <AnimatePresence>
                {showCart && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCart(false)} />
                        <CartDrawer cart={cart} onUpdate={updateCart} onClose={() => setShowCart(false)} onSelect={(p) => { setShowCart(false); setSelectedProduct(p); }} />
                    </>
                )}
            </AnimatePresence>

            {/* ── PRODUCT MODAL ── */}
            <AnimatePresence>
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        storeProducts={storeProducts}
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