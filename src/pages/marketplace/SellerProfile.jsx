import React, { useMemo, useState, useContext, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ThemeContext } from "../../context/ThemeContext";
import { collection, query, where, limit, startAfter, getDocs } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import ProductImageCarousel from "../dashboard/ProductImageCarousel";
import {
    FaSearch, FaWhatsapp, FaPhoneAlt, FaMoon, FaSun,
    FaStore, FaMapMarkerAlt, FaTag, FaFire,
    FaArrowLeft, FaShoppingCart, FaTrash, FaTimes, FaBox,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import LOgo from "../../images/me2sell-logo.png";

/* ─────────────────────────────────────────────────────────────────
   CART
───────────────────────────────────────────────────────────────── */
const CART_KEY = "marketplace_cart_v1";
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = (items) => { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch { } };

/* ─────────────────────────────────────────────────────────────────
   CART DRAWER
───────────────────────────────────────────────────────────────── */
function CartDrawer({ cart, onUpdate, onClose, onSelect }) {
    const remove = (e, id) => { e.stopPropagation(); onUpdate(cart.filter(i => i.id !== id)); };

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
                        onClick={() => { onClose(); onSelect(item); }}
                        className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 transition group">
                        {item.image
                            ? <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200" />
                            : <div className="flex justify-center pt-2"><FaBox className="text-4xl text-gray-300" /></div>
                        }
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-1 group-hover:text-green-600 transition-colors">{item.name}</p>
                            <p className="text-green-600 font-bold text-sm mt-1">{item.currencySymbol}{item.sellingPrice?.toLocaleString()}</p>
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
            <div className="relative overflow-hidden" onClick={() => onSelect(product)}>
                {product.image
                    ? <motion.img
                        key={imageIndex}
                        src={images[imageIndex] || images[0]}
                        alt={product.name}
                        className="w-full h-40 md:h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
                    />
                    : <div className="flex w-full h-40 md:h-44 justify-center items-center bg-gray-100 dark:bg-gray-700">
                        <FaBox className="text-[80px] text-gray-300" />
                    </div>
                }
                {product.sold > 0 && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FaFire size={8} className="text-orange-400" /> {product.sold} sold
                    </div>
                )}
                {product.location?.city && (
                    <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FaMapMarkerAlt size={8} className="text-green-600" /> {product.location.city}
                    </div>
                )}
            </div>

            <div className="p-3" onClick={() => onSelect(product)}>
                <h4 className="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-100 line-clamp-1">{product.name}</h4>
                {product.businessName && (
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <FaStore size={8} /> {product.businessName}
                    </p>
                )}
                <p className="text-green-600 font-bold md:text-base text-sm mt-2">
                    {product.currencySymbol}{product.sellingPrice?.toLocaleString()}
                </p>
            </div>

            <div className="px-3 pb-3">
                <button
                    onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2
                        ${inCart ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-600 hover:text-white"}`}
                >
                    <FaShoppingCart size={10} />
                    {inCart ? "Added ✓" : "Add to Cart"}
                </button>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   SHARE SHEET
───────────────────────────────────────────────────────────────── */
function ShareSheet({ title, subtitle, image, shareUrl, onClose }) {
    const [copied, setCopied] = useState(false);

    const shareText = `Check out ${title} on Me2Sell!`;

    const platforms = [
        {
            label: "WhatsApp",
            icon: <FaWhatsapp size={18} />,
            color: "#25D366",
            href: `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
        },
        {
            label: "Facebook",
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
            ),
            color: "#1877F2",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        {
            label: "X / Twitter",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.856L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            color: "#000000",
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        },
        {
            label: "SMS",
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            color: "#5856D6",
            href: `sms:?body=${encodeURIComponent(shareText + "\n" + shareUrl)}`,
        },
    ];

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">Share</h3>
                    <button onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                        <FaTimes size={14} className="text-gray-500" />
                    </button>
                </div>

                {/* Preview card */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
                    {image
                        ? <img src={image} alt={title} className="w-12 h-12 object-cover rounded-xl shrink-0" />
                        : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shrink-0">
                            <span className="text-white font-black text-lg">
                                {title?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    }
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-1">{title}</p>
                        {subtitle && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>}
                    </div>
                </div>

                {/* Platform buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {platforms.map(p => (
                        <a
                            key={p.label}
                            href={p.href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                style={{ background: p.color }}>
                                {p.icon}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{p.label}</span>
                        </a>
                    ))}
                </div>

                {/* Copy link */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">{shareUrl}</p>
                    <button
                        onClick={copyLink}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition
                            ${copied
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-600 hover:text-white"
                            }`}
                    >
                        {copied ? "Copied ✓" : "Copy"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   PRODUCT MODAL
───────────────────────────────────────────────────────────────── */
function ProductModal({ product, storeProducts, cart, onAddToCart, onClose, onSelect }) {
    const inCart = cart.some(i => i.id === product.id);
    const modalScrollRef = useRef(null);
    const [imgIndex, setImgIndex] = useState(0);
    const [showShare, setShowShare] = useState(false);
    const images = [product.image, product.image2].filter(Boolean);

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
                            {product.image
                                ? <>
                                    <motion.img
                                        key={imgIndex}
                                        src={images[imgIndex] || images[0]}
                                        alt={product.name}
                                        className="w-full h-64 md:h-80 object-cover"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                                    />
                                    {images.length > 1 && (
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                            {images.map((_, i) => (
                                                <button key={i} onClick={() => setImgIndex(i)}
                                                    className={`w-2 h-2 rounded-full transition ${i === imgIndex ? "bg-white" : "bg-white/50"}`} />
                                            ))}
                                        </div>
                                    )}
                                </>
                                : <div className="flex w-full h-64 md:h-80 justify-center items-center">
                                    <FaBox className="text-[120px] text-gray-300" />
                                </div>
                            }
                        </div>

                        {/* More from store — desktop */}
                        {storeProducts.length > 0 && (
                            <div className="mt-4 hidden md:block">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">More from this store</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {storeProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition shrink-0">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-20 object-cover" />
                                                : <div className="flex justify-center items-center h-20 bg-gray-100 dark:bg-gray-700"><FaBox className="text-4xl text-gray-300" /></div>
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

                        {/* Share button */}
                        <button
                            onClick={() => {
                                const shareUrl = `${window.location.href.split("?")[0]}?product=${product.id}`;
                                const shareText = `Check out ${product.name} for ${product.currencySymbol}${product.sellingPrice?.toLocaleString()} on Me2Sell!`;
                                if (navigator.share) {
                                    navigator.share({ title: product.name, text: shareText, url: shareUrl }).catch(() => { });
                                } else {
                                    setShowShare(true);
                                }
                            }}
                            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-500 hover:text-green-600 transition"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                            Share Product
                        </button>

                        {/* Share sheet */}
                        <AnimatePresence>
                            {showShare && (
                                <ShareSheet
                                    title={product.name}
                                    subtitle={`${product.currencySymbol}${product.sellingPrice?.toLocaleString()} · ${product.businessName || ""}`}
                                    image={product.image}
                                    shareUrl={`${window.location.href.split("?")[0]}?product=${product.id}`}
                                    onClose={() => setShowShare(false)}
                                />
                            )}
                        </AnimatePresence>

                        {/* More from store — mobile */}
                        {storeProducts.length > 0 && (
                            <div className="md:hidden">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">More from this store</h4>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {storeProducts.slice(0, 6).map(item => (
                                        <div key={item.id} onClick={() => onSelect(item)}
                                            className="min-w-[110px] cursor-pointer bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-md transition shrink-0">
                                            {item.image
                                                ? <img src={item.image} alt={item.name} className="w-full h-20 object-cover" />
                                                : <div className="flex justify-center items-center h-20 bg-gray-100 dark:bg-gray-700"><FaBox className="text-4xl text-gray-300" /></div>
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
    const { theme, toggleTheme } = useContext(ThemeContext);

    const PAGE_SIZE = 20;
    const LS_KEY = `seller_products_${sellerId}`;

    // ── State ────────────────────────────────────────────────────
    const [sellerProducts, setSellerProducts] = useState([]);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cart, setCartState] = useState(loadCart);
    const [showCart, setShowCart] = useState(false);
    const [user, setUser] = useState(null);
    const [imageIndexes, setImageIndexes] = useState({});
    const [showStoreShare, setShowStoreShare] = useState(false);
    const imageTimersRef = useRef({});

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

    // ── Fetch first page ─────────────────────────────────────────
    const fetchProducts = useCallback(async () => {
        setLoading(true);

        // Clear any stale/empty cache before fetching
        localStorage.removeItem(LS_KEY);

        try {
            const snap = await getDocs(
                query(
                    collection(db, "marketplaceProducts"),
                    where("sellerId", "==", sellerId),
                    limit(PAGE_SIZE)
                )
            );

            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const more = snap.docs.length === PAGE_SIZE;
            const last = snap.docs[snap.docs.length - 1] ?? null;

            setSellerProducts(list);
            setSeller(list[0] ?? null);
            setHasMore(more);
            setLastDoc(last);

            if (list.length > 0) {
                localStorage.setItem(LS_KEY, JSON.stringify({
                    products: list,
                    hasMore: more,
                    timestamp: Date.now(),
                }));
            }
        } catch (err) {
            console.error("fetchProducts error:", err);
        } finally {
            setLoading(false);
        }
    }, [sellerId]);

    // ── Fetch next page ──────────────────────────────────────────
    const fetchMore = useCallback(async () => {
        if (loadingMore || !hasMore || !lastDoc) return;
        setLoadingMore(true);
        try {
            const snap = await getDocs(
                query(
                    collection(db, "marketplaceProducts"),
                    where("sellerId", "==", sellerId),
                    limit(PAGE_SIZE),
                    startAfter(lastDoc)
                )
            );

            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            setSellerProducts(prev => {
                const merged = [...prev, ...list].filter(
                    (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
                );
                return merged;
            });
            setHasMore(snap.docs.length === PAGE_SIZE);
            setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
        } catch (err) {
            console.error("fetchMore error:", err);
        } finally {
            setLoadingMore(false);
        }
    }, [sellerId, lastDoc, hasMore, loadingMore]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    // ── Deep-link: open product modal from ?product=ID ───────────────
    useEffect(() => {
        if (!sellerProducts.length) return;
        const params = new URLSearchParams(window.location.search);
        const productId = params.get("product");
        if (!productId) return;
        const found = sellerProducts.find(p => p.id === productId);
        if (found) {
            setSelectedProduct(found);
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [sellerProducts]);

    // ── Search filter (client-side on loaded products) ───────────
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return sellerProducts;
        const q = searchQuery.toLowerCase();
        return sellerProducts.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.categoryId?.toLowerCase().includes(q) ||
            p.department?.toLowerCase().includes(q)
        );
    }, [sellerProducts, searchQuery]);

    // ── Modal "more from store" strip ────────────────────────────
    const storeProducts = useMemo(
        () => selectedProduct ? sellerProducts.filter(p => p.id !== selectedProduct.id) : [],
        [sellerProducts, selectedProduct]
    );

    // ── Image slideshow ──────────────────────────────────────────
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

    // ── Loading screen ───────────────────────────────────────────
    if (loading) {
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

    // ── Store not found ──────────────────────────────────────────
    if (!loading && sellerProducts.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-3 text-gray-400">
                <FaStore size={40} />
                <p className="font-semibold">Store not found</p>
                <p className="text-sm text-center max-w-xs">
                    This seller has no published products, or the store may have moved.
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
                        <img src={LOgo} alt="Me2Sell" className="hidden md:block h-7 w-auto" />
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
                            : <FaSun size={13} className="text-yellow-400" />}
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* ── SELLER BANNER ── */}
                {seller && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shrink-0">
                                    <span className="text-white font-black text-2xl">
                                        {(seller.businessName || "?").charAt(0).toUpperCase()}
                                    </span>
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
                                        <span className="flex items-center gap-1">
                                            <FaTag size={9} className="text-green-600" />
                                            {sellerProducts.length} product{sellerProducts.length !== 1 ? "s" : ""}
                                        </span>
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

                                {/* Share store button */}
                                <button
                                    onClick={() => {
                                        const shareUrl = window.location.href.split("?")[0];
                                        const shareText = `Check out ${seller.businessName}'s store on Me2Sell!`;
                                        if (navigator.share) {
                                            navigator.share({ title: seller.businessName, text: shareText, url: shareUrl }).catch(() => { });
                                        } else {
                                            setShowStoreShare(true);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400 transition"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                    </svg>
                                    Share
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PRODUCTS HEADER ── */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        Products
                        <span className="ml-2 text-sm font-normal text-gray-400">
                            ({filteredProducts.length}{searchQuery ? " matching" : ""})
                        </span>
                    </h2>
                </div>

                {/* ── PRODUCT GRID ── */}
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

                {/* ── LOAD MORE ── */}
                {hasMore && !searchQuery && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={fetchMore}
                            disabled={loadingMore}
                            className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-green-600 hover:text-white hover:border-green-600 font-semibold text-sm transition shadow-sm disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <span className="flex items-center gap-2">
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                    />
                                    Loading...
                                </span>
                            ) : "Load More"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── CART DRAWER ── */}
            <AnimatePresence>
                {showCart && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCart(false)} />
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
                        storeProducts={storeProducts}
                        cart={cart}
                        onAddToCart={addToCart}
                        onClose={() => setSelectedProduct(null)}
                        onSelect={setSelectedProduct}
                    />
                )}
            </AnimatePresence>

            {/* ── STORE SHARE SHEET ── */}
            <AnimatePresence>
                {showStoreShare && seller && (
                    <ShareSheet
                        title={seller.businessName}
                        subtitle={`${sellerProducts.length} product${sellerProducts.length !== 1 ? "s" : ""}${seller.country ? ` · ${seller.country}` : ""}`}
                        shareUrl={window.location.href.split("?")[0]}
                        onClose={() => setShowStoreShare(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}