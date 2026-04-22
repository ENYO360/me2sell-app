// src/components/dashboard/Departments.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../firebase/config";
import { useSearch } from "../../context/SearchContext";
import { useCart } from "../../context/CartContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useNotification } from "../../context/NotificationContext";
import { useConfirmModal } from "../../context/ConfirmationContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDocs,
} from "firebase/firestore";
import DashboardLayout from "./O_DashboardLayout";
import SaleModal from "./SaleModal";
import ProductImageCarousel from "./ProductImageCarousel";
import {
  FaPlus, FaTrash, FaEdit, FaArrowLeft,
  FaEllipsisV, FaShoppingCart, FaMoneyBill,
  FaMoneyBillWave, FaBuilding,
} from "react-icons/fa";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [selectedDept, setSelectedDept] = useState(null);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { setScope, results } = useSearch();
  const { addToCart, adding } = useCart();
  const { startSale } = useDirectSale();
  const { notify } = useNotification();
  const { openConfirm } = useConfirmModal();
  const { currency } = useCurrency();
  const { products, getProductsByDepartment, lowStockThreshold } = useProducts();
  const user = auth.currentUser;

  useEffect(() => { setScope("all-products"); }, []);

  const fetchDepartments = async (uid) => {
    setFetching(true);
    const ref = collection(db, "departments", uid, "userDepartments");
    const snap = await getDocs(ref);
    setDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setFetching(false);
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) { setDepartments([]); setFetching(false); return; }
      fetchDepartments(u.uid);
    });
    return () => unsub();
  }, []);

  const deptProducts = selectedDept ? getProductsByDepartment(selectedDept.id) : [];

  const departmentsWithCounts = departments.map((dept) => ({
    ...dept,
    productCount: products.filter((p) => p.departmentId === dept.id).length,
  }));
  const deptCounts = Object.fromEntries(departmentsWithCounts.map((d) => [d.id, d.productCount]));

  const openAddModal = () => {
    setEditingDept(null);
    setInitialFormData(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
    requestAnimationFrame(() => setModalVisible(true));
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => { setShowModal(false); setEditingDept(null); }, 250);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const isDeptFormUnchanged = () => {
    if (!editingDept || !initialFormData) return false;
    return formData.name === initialFormData.name && formData.description === initialFormData.description;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const u = auth.currentUser;
    if (!u) return;
    try {
      if (editingDept) {
        await updateDoc(doc(db, "departments", u.uid, "userDepartments", editingDept.id), {
          name: formData.name, description: formData.description, updatedAt: serverTimestamp(),
        });
        await fetchDepartments(u.uid);
        localStorage.removeItem("departments");
        notify(`Department "${formData.name}" updated.`);
        openConfirm(`Department "${formData.name}" updated.`);
      } else {
        const ref = collection(db, "departments", u.uid, "userDepartments");
        const newRef = await addDoc(ref, {
          uid: u.uid, name: formData.name, description: formData.description || "",
          createdAt: serverTimestamp(),
        });
        await updateDoc(newRef, { departmentId: newRef.id });
        await fetchDepartments(u.uid);
        localStorage.removeItem("departments");
        notify(`Department "${formData.name}" created.`);
        openConfirm(`Department "${formData.name}" created.`);
      }
      closeModal();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dept) => {
    const initial = { name: dept.name || "", description: dept.description || "" };
    setEditingDept(dept);
    setFormData(initial);
    setInitialFormData(initial);
    setShowModal(true);
    requestAnimationFrame(() => setModalVisible(true));
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    const uid = auth.currentUser.uid;
    await deleteDoc(doc(db, "departments", uid, "userDepartments", dept.id));
    await fetchDepartments(uid);
    localStorage.removeItem("departments");
    notify(`Department "${dept.name}" deleted.`);
    openConfirm(`Department "${dept.name}" deleted.`);
    if (selectedDept?.id === dept.id) setSelectedDept(null);
  };

  // ── Product card (search results + dept detail) ───────────────────────────
  const ProductCard = ({ p, adding }) => {
    const isLowStock = p.quantity > 0 && p.quantity <= lowStockThreshold;
    const isOut = p.quantity === 0;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
          ${isOut ? "opacity-70 border-gray-100" : "border-gray-100 hover:shadow-md hover:border-[#03165A]/15"}`}
      >
        {/* accent bar */}
        <div className={`h-1 w-full ${isOut ? "bg-red-400" : isLowStock ? "bg-amber-400" : "bg-gradient-to-r from-[#03165A] to-green-500"}`} />

        {/* image */}
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
            <span className="font-bold text-[#03165A]">{currency.symbol}{(p.sellingPrice ?? p.price ?? 0).toLocaleString()}</span>
          </div>
          {p.category && <p className="text-[10px] text-gray-400">Category: {p.category}</p>}

          {isOut ? (
            <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">
              Out of Stock
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => addToCart(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
                {adding === p.id ? (
                  <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                ) : (
                  <><FaShoppingCart className="text-[10px]" /> Add</>
                )}
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
  };

  // ── Search results view ───────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#03165A]">Search Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{results.length} product{results.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((p) => <ProductCard key={p.id} p={p} adding={adding} />)}
          </div>
        </div>
        <SaleModal />
      </DashboardLayout>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16" onClick={() => setMenuOpenFor(null)}>

        {/* ── HEADER ── */}
        {!selectedDept ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#03165A]">Departments</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {departments.length} department{departments.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-[#051d70] active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-[#03165A]/20 transition-all">
              <FaPlus className="text-xs" /> Add Department
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSelectedDept(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[#03165A] transition shadow-sm flex-shrink-0">
                <FaArrowLeft className="text-sm" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Department</p>
                <h1 className="text-xl sm:text-2xl font-bold text-[#03165A] truncate">{selectedDept.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleEdit(selectedDept)}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
                Edit
              </button>
              <button onClick={() => handleDelete(selectedDept)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition shadow-sm shadow-red-500/20">
                Delete
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {fetching && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-100 rounded-lg w-full" />
                <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                <div className="h-8 bg-gray-100 rounded-xl w-full mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* ── DEPARTMENTS GRID ── */}
        {!fetching && !selectedDept && (
          <>
            {departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/6 flex items-center justify-center">
                  <FaBuilding className="text-[#03165A]/30 text-2xl" />
                </div>
                <p className="text-gray-400 font-semibold text-sm">No departments yet</p>
                <p className="text-xs text-gray-300">Create one to organise your products</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-fr">
                {departments.map((dept, index) => (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, type: "spring", stiffness: 340, damping: 26 }}
                    className="relative"
                  >
                    <div
                      onClick={() => { setSelectedDept(dept); setMenuOpenFor(null); }}
                      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#03165A]/15 transition-all cursor-pointer overflow-hidden h-full"
                    >
                      {/* Accent */}
                      <div className="h-1 w-full bg-gradient-to-r from-[#03165A] to-green-500" />

                      <div className="p-4 space-y-3">
                        {/* Name + menu */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{dept.name}</h3>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                              {dept.description || "No description"}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === dept.id ? null : dept.id); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                          >
                            <FaEllipsisV className="text-xs" />
                          </button>
                        </div>

                        {/* Product count */}
                        <div className="flex items-end justify-between pt-1">
                          <div className="bg-blue-500/[0.05] rounded-xl px-3 py-2 text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Products</p>
                            <p className="text-xl font-black text-[#03165A] mt-0.5">{deptCounts[dept.id] ?? 0}</p>
                          </div>
                          {dept.createdAt?.toDate && (
                            <p className="text-[10px] text-gray-300 text-right leading-tight">
                              {dept.createdAt.toDate().toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Three-dot dropdown */}
                    <AnimatePresence>
                      {menuOpenFor === dept.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          transition={{ duration: 0.13 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-12 right-3 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-30"
                        >
                          <button
                            onClick={() => { handleEdit(dept); setMenuOpenFor(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <FaEdit className="text-[#03165A] text-xs" /> Edit
                          </button>
                          <div className="h-px bg-gray-100 mx-2" />
                          <button
                            onClick={() => { handleDelete(dept); setMenuOpenFor(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
                          >
                            <FaTrash className="text-xs" /> Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DEPARTMENT DETAIL VIEW ── */}
        {!fetching && selectedDept && (
          <div className="space-y-5">
            {/* Info card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedDept.description || "No description provided."}
                </p>
                <div className="flex gap-4 flex-wrap">
                  <div className="bg-blue-500/[0.04] rounded-xl px-4 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400">Products</p>
                    <p className="text-2xl font-black text-[#03165A] mt-0.5">{deptCounts[selectedDept.id] ?? 0}</p>
                  </div>
                  {selectedDept.createdAt?.toDate && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400">Created</p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        {selectedDept.createdAt.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products in dept */}
            <div className="space-y-4">
              <h4 className="font-bold text-[#03165A] text-lg">
                Products in <span className="text-green-600">{selectedDept.name}</span>
              </h4>

              {(results.length > 0 ? results : deptProducts).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <FaBuilding className="text-gray-300 text-lg" />
                  </div>
                  <p className="text-gray-400 text-sm">No products in this department yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(results.length > 0 ? results : deptProducts).map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADD / EDIT MODAL ── */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{
              background: modalVisible ? "rgba(3,22,90,0.45)" : "rgba(3,22,90,0)",
              backdropFilter: modalVisible ? "blur(8px)" : "blur(0px)",
              transition: "background 0.25s ease, backdrop-filter 0.25s ease",
            }}
            onClick={closeModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
              style={{
                transform: modalVisible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
                opacity: modalVisible ? 1 : 0,
                transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease",
              }}
            >
              {/* Accent bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />

              {/* Mobile handle */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="px-7 pt-5 pb-8 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-0.5">
                      {editingDept ? "Edit" : "New"}
                    </p>
                    <h3 className="text-2xl font-bold text-[#03165A]">
                      {editingDept ? "Edit Department" : "Add Department"}
                    </h3>
                  </div>
                  <button onClick={closeModal}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Department Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Electronics"
                      required
                      className="w-full px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      Description <span className="normal-case text-gray-300 font-normal">(optional)</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of this department…"
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition resize-none"
                    />
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || isDeptFormUnchanged()}
                      className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95
                        ${loading || isDeptFormUnchanged()
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25"
                        }`}
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {editingDept ? "Save Changes" : "Create Department"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
      <SaleModal />
    </DashboardLayout>
  );
}