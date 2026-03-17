// src/components/dashboard/Categories.jsx
import React, { useEffect, useState, useMemo } from "react";
import { db, auth } from "../../firebase/config";
import DashboardLayout from "./O_DashboardLayout.jsx";
import ProductImageCarousel from "./ProductImageCarousel.jsx";
import SaleModal from "./SaleModal.jsx";
import {
  collection, query, where, getDocs, setDoc,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { MARKETPLACE_CATEGORIES } from "../../marketplaceCategories";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext";
import { useSearch } from "../../context/SearchContext.jsx";
import { useDirectSale } from "../../context/DirectSaleContext.jsx";
import { useNotification } from "../../context/NotificationContext.jsx";
import { useConfirmModal } from "../../context/ConfirmationContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { useProducts } from "../../context/ProductContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus, FaArrowLeft, FaTrash, FaEdit,
  FaShoppingCart, FaMoneyBill, FaMoneyBillWave, FaTag,
} from "react-icons/fa";

// ── Shared product card (search + category detail) ────────────────────────────
function ProductCard({ p, currency, addToCart, startSale, lowStockThreshold }) {
  const isLowStock = p.quantity > 0 && p.quantity <= lowStockThreshold;
  const isOut      = p.quantity === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
        ${isOut ? "opacity-70 border-gray-100" : "border-gray-100 hover:shadow-md hover:border-[#03165A]/15"}`}
    >
      <div className={`h-1 w-full ${isOut ? "bg-red-400" : isLowStock ? "bg-amber-400" : "bg-gradient-to-r from-[#03165A] to-green-500"}`} />

      <div className="relative">
        <ProductImageCarousel images={[p.image, p.image2].filter(Boolean)} />
        {isLowStock && !isOut && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full animate-pulse">
            Low · {p.quantity}
          </span>
        )}
        {isOut && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
            Out of Stock
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h5 className="font-bold text-sm text-gray-900 line-clamp-1">{p.name}</h5>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Stock: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"}`}>{p.quantity ?? 0}</span></span>
          <span className="font-bold text-[#03165A]">{currency.symbol}{(p.sellingPrice ?? 0).toLocaleString()}</span>
        </div>
        {p.department && <p className="text-[10px] text-gray-400">Dept: {p.department}</p>}

        {isOut ? (
          <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">
            Out of Stock
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => addToCart(p)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaShoppingCart className="text-[10px]" /> Add
            </button>
            <button onClick={() => startSale(p)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaMoneyBillWave className="text-[10px]" /> Sell
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Modal shell (spring + blur overlay) ──────────────────────────────────────
function Modal({ open, onClose, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background:     visible ? "rgba(3,22,90,0.45)" : "rgba(3,22,90,0)",
        backdropFilter: visible ? "blur(8px)" : "blur(0px)",
        transition: "background 0.25s ease, backdrop-filter 0.25s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
        style={{
          transform:  visible ? "translateY(0) scale(1)"    : "translateY(40px) scale(0.97)",
          opacity:    visible ? 1 : 0,
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease",
        }}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories]           = useState([]);
  const [activeCategory, setActiveCategory]   = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [initialEditData, setInitialEditData] = useState(null);
  const [saving, setSaving]                   = useState(false);
  const [newCategory, setNewCategory]         = useState({ name: "", description: "" });
  const [editData, setEditData]               = useState({ name: "", description: "" });

  const { addToCart }                                             = useCart();
  const { setScope, results }                                     = useSearch();
  const { startSale }                                             = useDirectSale();
  const { notify }                                                = useNotification();
  const { openConfirm }                                           = useConfirmModal();
  const { currency }                                              = useCurrency();
  const { products, lowStockThreshold }                           = useProducts();
  const { user }                                                  = useAuth();

  useEffect(() => { setScope("all-products"); }, []);

  const fetchCategories = async (uid) => {
    const ref  = collection(db, "categories", uid, "userCategories");
    const snap = await getDocs(ref);
    setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (!user) { setCategories([]); return; }
    fetchCategories(user.uid);
  }, [user]);

  const categoryProducts = useMemo(() => {
    if (!activeCategory) return [];
    return products.filter((p) => p.categoryId === activeCategory.id);
  }, [activeCategory, products]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const p of products) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    return counts;
  }, [products]);

  const isCategoryUnchanged = () => {
    if (!initialEditData) return false;
    return editData.name === initialEditData.name && editData.description === initialEditData.description;
  };

  const handleCreate = async () => {
    if (!newCategory.name) return alert("Category name required.");
    setSaving(true);
    const uid         = auth.currentUser.uid;
    const categoryMeta = MARKETPLACE_CATEGORIES.find((c) => c.id === newCategory.name);
    if (!categoryMeta) { setSaving(false); return alert("Invalid category selected."); }

    const existing = await getDocs(query(
      collection(db, "categories", uid, "userCategories"),
      where("categoryId", "==", newCategory.name)
    ));
    if (!existing.empty) { setSaving(false); return alert("This category already exists."); }

    const ref = doc(db, "categories", uid, "userCategories", newCategory.name);
    await setDoc(ref, {
      categoryId: newCategory.name, name: categoryMeta.name,
      description: newCategory.description || "", createdAt: serverTimestamp(),
    });

    await fetchCategories(uid);
    localStorage.removeItem("categories");
    setSaving(false);
    notify(`Category "${categoryMeta.name}" created.`);
    openConfirm(`Category "${categoryMeta.name}" has been created.`);
    setShowCreateModal(false);
    setNewCategory({ name: "", description: "" });
  };

  const handleEdit = async () => {
    const uid          = auth.currentUser.uid;
    setSaving(true);
    const categoryMeta = MARKETPLACE_CATEGORIES.find((c) => c.name === editData.name || c.id === editData.name);
    if (!categoryMeta) { setSaving(false); return alert("Invalid category selected."); }

    const oldRef = doc(db, "categories", uid, "userCategories", activeCategory.id);
    const newRef = doc(db, "categories", uid, "userCategories", categoryMeta.id);

    if (activeCategory.id === categoryMeta.id) {
      await updateDoc(oldRef, { description: editData.description });
    } else {
      await deleteDoc(oldRef);
      await setDoc(newRef, {
        categoryId: categoryMeta.id, name: categoryMeta.name,
        description: editData.description, createdAt: activeCategory.createdAt,
      });
      setActiveCategory({ ...activeCategory, id: categoryMeta.id, categoryId: categoryMeta.id, name: categoryMeta.name, description: editData.description });
    }

    await fetchCategories(uid);
    localStorage.removeItem("categories");
    setSaving(false);
    notify(`Category "${categoryMeta.name}" updated.`);
    openConfirm(`Category "${categoryMeta.name}" has been updated.`);
    setShowEditModal(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this category?")) return;
    const uid = auth.currentUser.uid;
    await deleteDoc(doc(db, "categories", uid, "userCategories", activeCategory.id));
    await fetchCategories(uid);
    localStorage.removeItem("categories");
    notify(`Deleted category: ${activeCategory.name}`);
    openConfirm(`Deleted category: ${activeCategory.name}`);
    setActiveCategory(null);
  };

  const sharedCardProps = { currency, addToCart, startSale, lowStockThreshold };

  // ── Search results ──────────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#03165A]">Search Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{results.length} product{results.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((p) => <ProductCard key={p.id} p={p} {...sharedCardProps} />)}
          </div>
        </div>
        <SaleModal />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16">

        {/* ── HEADER ── */}
        {!activeCategory ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#03165A]">Categories</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
              </p>
            </div>
            <button
              onClick={() => { setShowCreateModal(true); setNewCategory({ name: "", description: "" }); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-[#051d70] active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#03165A]/20 transition-all"
            >
              <FaPlus className="text-xs" /> Add Category
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveCategory(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#03165A] transition shadow-sm flex-shrink-0"
              >
                <FaArrowLeft className="text-sm" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Category</p>
                <h1 className="text-xl sm:text-2xl font-bold text-[#03165A] truncate">{activeCategory.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const initial = { name: activeCategory.name || "", description: activeCategory.description || "" };
                  setEditData(initial);
                  setInitialEditData(initial);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition shadow-sm shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* ── CATEGORY LIST ── */}
        {!activeCategory && (
          <>
            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/6 flex items-center justify-center">
                  <FaTag className="text-[#03165A]/30 text-2xl" />
                </div>
                <p className="text-gray-400 font-semibold text-sm">No categories yet</p>
                <p className="text-xs text-gray-300">Add categories to organise your products</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, type: "spring", stiffness: 340, damping: 26 }}
                    onClick={() => setActiveCategory(cat)}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#03165A]/15 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-[#03165A] to-green-500" />

                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/8 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/12 transition">
                          <FaTag className="text-[#03165A] text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{cat.name}</h3>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {cat.description || "No description"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-1">
                        <div className="bg-blue-500/[0.05] rounded-xl px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest">Products</p>
                          <p className="text-xl font-black text-[#03165A] mt-0.5">{categoryCounts[cat.id] ?? 0}</p>
                        </div>
                        {cat.createdAt?.toDate && (
                          <p className="text-[10px] text-gray-300 text-right leading-tight">
                            {cat.createdAt.toDate().toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CATEGORY DETAIL ── */}
        {activeCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {activeCategory.description || "No description provided."}
                </p>
                <div className="flex gap-4 flex-wrap">
                  <div className="bg-blue-500/[0.04] rounded-xl px-4 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">Products</p>
                    <p className="text-2xl font-black text-[#03165A] mt-0.5">{categoryCounts[activeCategory.id] ?? 0}</p>
                  </div>
                  {activeCategory.createdAt?.toDate && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400">Created</p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {activeCategory.createdAt.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products */}
            <h4 className="font-bold text-[#03165A] text-lg">
              Products in <span className="text-green-600">{activeCategory.name}</span>
            </h4>

            {categoryProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <FaTag className="text-gray-300 text-lg" />
                </div>
                <p className="text-gray-400 text-sm">No products in this category yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryProducts.map((p) => (
                  <ProductCard key={p.id} p={p} {...sharedCardProps} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CREATE MODAL ── */}
        <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="px-7 pt-5 pb-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-0.5">New</p>
                <h3 className="text-2xl font-bold text-[#03165A]">Add Category</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Category</label>
                <select
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition"
                >
                  <option value="" disabled>Select a category…</option>
                  {MARKETPLACE_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Description <span className="normal-case font-normal text-gray-300">(optional)</span>
                </label>
                <textarea
                  placeholder="Brief description…"
                  rows={3}
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition resize-none"
                />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newCategory.name}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" /> Creating…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Create Category</>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* ── EDIT MODAL ── */}
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
          <div className="px-7 pt-5 pb-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-0.5">Edit</p>
                <h3 className="text-2xl font-bold text-[#03165A]">Edit Category</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Category</label>
                <select
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition"
                >
                  <option value="" disabled>Select a category…</option>
                  {MARKETPLACE_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Description</label>
                <textarea
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition resize-none"
                />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || isCategoryUnchanged()}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-blue-500 hover:bg-[#051d70] shadow-lg shadow-[#03165A]/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </Modal>

      </div>
      <SaleModal />
    </DashboardLayout>
  );
}