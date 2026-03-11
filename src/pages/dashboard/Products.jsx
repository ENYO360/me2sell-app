import React, { useEffect, useState } from "react";
import DashboardLayout from "./O_DashboardLayout";
import { useSearch } from "../../context/SearchContext";
import { useNotification } from "../../context/NotificationContext";
import { useConfirmModal } from "../../context/ConfirmationContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";
import LowStockSettings from "../../components/LowStockSettings";
import { db, auth } from "../../firebase/config";
import { getStorage, ref, deleteObject, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { compressTo50KB } from "../../utils/compressImage";
import { app } from "../../firebase/config";
import { useMeta } from "../../context/MetaContext";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdSettings } from "react-icons/io";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { BiDotsVerticalRounded } from "react-icons/bi";
import { stampProductVersion } from "../../utils/stampProductVersion";

export default function Products() {
  const { categories, departments, loading } = useMeta();

  const [modalOpen, setModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [errors, setErrors] = useState({});

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    costPrice: "",
    sellingPrice: "",
    quantity: "",
    category: "",
    department: "",
    description: "",
    image: null,
    image2: null,
    pushToMarketplace: true,
  });

  const [initialForm, setInitialForm] = useState(form);

  const [user, setUser] = useState(null);
  const { setScope, results } = useSearch();
  const { notify } = useNotification();
  const { openConfirm } = useConfirmModal();
  const { currency } = useCurrency();
  const { products, lowStockThreshold } = useProducts();

  const storage = getStorage(app);

  useEffect(() => {
    setScope("all-products");
  }, []);


  // ================
  // AUTH WATCHER
  // ================
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) return;

      setUser(u);
    });

    return () => unsub();
  }, []);

  // Modal scroll lock
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [modalOpen]);

  // ================
  // OPEN ADD PRODUCT MODAL
  // ================
  const openAddModal = () => {
    setEditingProduct(null);
    setInitialForm(null);
    setForm({
      name: "",
      costPrice: "",
      sellingPrice: "",
      quantity: "",
      category: "",
      department: "",
      description: "",
      image: null,
      image2: null,
      pushToMarketplace: true,
    });
    setModalOpen(true);
  };

  // ================
  // OPEN EDIT MODAL
  // ================
  const openEditModal = (product) => {
    const initialData = {
      name: product.name,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      category: product.categoryId || "",
      department: product.departmentId || "",
      description: product.description || "",
      image: product.image || null,
      image2: product.image2 || null,
      pushToMarketplace: product.pushToMarketplace ?? true,
    };

    setEditingProduct(product);
    setForm(initialData);
    setInitialForm(initialData);
    setModalOpen(true);
  };

  // Product Image Upload
  const uploadImage = async (file, uid, productId, index, setProgress) => {
    if (!file) return null;
    if (!auth.currentUser) throw new Error("Auth not ready");

    const compressedFile = await compressTo50KB(file);

    const imageRef = ref(
      storage,
      `products/${uid}/${productId}/image_${index}`
    );

    const uploadTask = uploadBytesResumable(imageRef, compressedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(percent));
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const isFormUnchanged = () => {
    if (!editingProduct || !initialForm) return false;

    return (
      form.name === initialForm.name &&
      String(form.costPrice) === String(initialForm.costPrice) &&
      String(form.sellingPrice) === String(initialForm.sellingPrice) &&
      String(form.quantity) === String(initialForm.quantity) &&
      form.category === initialForm.category &&
      form.department === initialForm.department &&
      form.description === initialForm.description &&
      form.pushToMarketplace === initialForm.pushToMarketplace &&
      !(form.image instanceof File) &&
      !(form.image2 instanceof File)
    );
  };

  // ================
  // HANDLE FORM SUBMIT
  // ================
  const saveProduct = async () => {
    if (!user || uploading) return;
    if (!validateForm()) return;

    setSaving(true);

    const selectedDept = departments.find(d => d.id === form.department);
    const selectedCategory = categories.find(c => c.id === form.category);

    setUploading(true);

    let productId;

    if (editingProduct) {
      productId = editingProduct.id;
    } else {
      const ref = await addDoc(
        collection(db, "products", user.uid, "productList"),
        { createdAt: serverTimestamp() }
      );
      productId = ref.id;
    }

    const imageUrl =
      form.image instanceof File
        ? await uploadImage(form.image, user.uid, productId, "1", setUploadProgress)
        : editingProduct?.image || "";

    const imageUrl2 =
      form.image2 instanceof File
        ? await uploadImage(form.image2, user.uid, productId, "2", setUploadProgress)
        : editingProduct?.image2 || "";

    await setDoc(
      doc(db, "products", user.uid, "productList", productId),
      {
        name: form.name,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        quantity: Number(form.quantity),
        category: selectedCategory?.name || "",
        categoryId: selectedCategory?.id || "",
        department: selectedDept?.name || "",
        departmentId: selectedDept?.id || "",
        description: form.description,
        image: imageUrl,
        image2: imageUrl2,
        uid: user.uid,
        pushToMarketplace: form.pushToMarketplace,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await stampProductVersion();

    setSaving(false);
    setUploading(false);
    setUploadProgress(0);

    notify(`Product "${form.name}" ${editingProduct ? "updated" : "added"}`, "product");
    openConfirm(`Product "${form.name}" ${editingProduct ? "updated" : "added"}.`);
    setModalOpen(false);
  };


  // ================
  // DELETE PRODUCT
  // ================
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product permanently?")) return;

    try {
      const productRef = doc(db, "products", user.uid, "productList", id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        alert("Product not found");
        return;
      }

      const productData = productSnap.data();

      const storage = getStorage(app);

      // 🔥 Delete image 1 if exists
      if (productData.image) {
        const imageRef = ref(storage, productData.image);
        await deleteObject(imageRef).catch(() => { });
      }

      // 🔥 Delete image 2 if exists
      if (productData.image2) {
        const imageRef2 = ref(storage, productData.image2);
        await deleteObject(imageRef2).catch(() => { });
      }

      // 🔥 Finally delete Firestore document
      await deleteDoc(productRef);

      openConfirm(`Product "${productData.name}" has been deleted.`);
      notify(`Product "${productData.name}" has been deleted.`, "product");

    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete product");
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".menu-area")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (form.costPrice === "" || isNaN(form.costPrice) || Number(form.costPrice) <= 0) {
      newErrors.costPrice = "Cost price is required";
    }

    if (form.sellingPrice === "" || isNaN(form.sellingPrice) || Number(form.sellingPrice) <= 0) {
      newErrors.sellingPrice = "Selling price is required";
    }

    setErrors(newErrors);

    // valid only if no errors
    return Object.keys(newErrors).length === 0;
  };

  const lowCount = products.filter(p => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const outCount = products.filter(p => p.quantity === 0).length;
  const allCount = products.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-500">Products</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {products.length} product{products.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-blue-500 transition shadow-sm"
              title="Stock settings"
            >
              <IoMdSettings size={18} />
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-[#051d70] active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              <FaPlus className="text-xs" /> Add Product
            </button>
          </div>
        </div>

        {/* ── STOCK FILTER TABS ── */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all",  label: "All",          count: allCount,  activeClass: "bg-blue-500 text-white shadow-blue-500/20" },
            { key: "low",  label: "Low Stock",     count: lowCount,  activeClass: "bg-amber-500 text-white shadow-amber-500/20" },
            { key: "out",  label: "Out of Stock",  count: outCount,  activeClass: "bg-red-500 text-white shadow-red-500/20"    },
          ].map(({ key, label, count, activeClass }) => (
            <button
              key={key}
              onClick={() => setStockFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                stockFilter === key
                  ? `${activeClass} shadow-lg`
                  : "bg-white border border-gray-200 text-gray-500 hover:border-blue-500/30 hover:text-blue-500"
              }`}
            >
              {label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[11px] font-bold ${
                stockFilter === key ? "bg-white/20" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── PRODUCT GRID ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            const baseList = results.length > 0 ? results : products;
            const filteredList = baseList.filter((p) => {
              const qty = Number(p.quantity);
              if (stockFilter === "low") return qty > 0 && qty <= lowStockThreshold;
              if (stockFilter === "out") return qty === 0;
              return true;
            });

            if (filteredList.length === 0) {
              return (
                <div className="col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/6 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#03165A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    </svg>
                  </div>
                  <p className="text-gray-400 font-semibold text-sm">No products found</p>
                </div>
              );
            }

            return filteredList.map((p) => {
              const isLowStock = p.quantity > 0 && p.quantity <= lowStockThreshold;
              const isOut = p.quantity === 0;
              const profit = Number(p.sellingPrice) - Number(p.costPrice);
              const margin = Number(p.costPrice) > 0
                ? Math.round((profit / Number(p.costPrice)) * 100)
                : 0;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`group relative bg-white rounded-2xl border shadow-sm transition-all overflow-hidden
                    ${isOut
                      ? "opacity-75 border-gray-100"
                      : "border-gray-100 hover:shadow-md hover:border-blue-500/15"
                    }`}
                >
                  {/* Top accent */}
                  <div className={`h-1 w-full ${
                    isOut      ? "bg-red-400"
                    : isLowStock ? "bg-amber-400"
                    : "bg-gradient-to-r from-blue-500 to-green-500"
                  }`} />

                  <div className="p-4 space-y-3">

                    {/* Badge + menu row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 pt-0.5">
                        {isOut && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full mb-1.5">
                            <span className="w-1 h-1 rounded-full bg-red-500" /> Out of Stock
                          </span>
                        )}
                        {isLowStock && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full mb-1.5 animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-amber-500" /> Low Stock · {p.quantity}
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                          {p.name}
                        </h3>
                      </div>

                      {/* Three-dot menu */}
                      <div className="relative menu-area flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === p.id ? null : p.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                        >
                          <BiDotsVerticalRounded size={18} />
                        </button>

                        {openMenuId === p.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1,   y: 0  }}
                            transition={{ duration: 0.13 }}
                            className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20"
                          >
                            <button
                              onClick={() => { openEditModal(p); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                            >
                              <FaEdit className="text-blue-500 text-xs" /> Edit
                            </button>
                            <div className="h-px bg-gray-100 mx-2" />
                            <button
                              onClick={() => { deleteProduct(p.id); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
                            >
                              <FaTrash className="text-xs" /> Delete
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Price breakdown */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Cost</span>
                        <span className="font-semibold text-gray-600">
                          {currency.symbol}{Number(p.costPrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Selling</span>
                        <span className="font-bold text-blue-500">
                          {currency.symbol}{Number(p.sellingPrice).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Profit</span>
                        <span className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {profit >= 0 ? "+" : ""}{currency.symbol}{profit.toLocaleString()}
                          {margin !== 0 && (
                            <span className="ml-1 text-[10px] opacity-70">({margin}%)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-100" />

                    {/* Meta row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Qty</p>
                        <p className={`text-sm font-bold mt-0.5 ${
                          isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-800"
                        }`}>
                          {p.quantity}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Category</p>
                        <p className="text-sm font-semibold text-gray-700 mt-0.5 truncate">
                          {p.category || "—"}
                        </p>
                      </div>
                    </div>

                    {p.department && (
                      <p className="text-[11px] text-gray-400">
                        Dept: <span className="text-gray-600 font-medium">{p.department}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>

        {/* ── ADD / EDIT MODAL ── */}
        <AnimatePresence>
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              style={{ background: "rgba(3,22,90,0.45)", backdropFilter: "blur(8px)" }}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 24 }}
                animate={{ scale: 1,    opacity: 1, y: 0  }}
                exit={{    scale: 0.94, opacity: 0, y: 24 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
              >
                {/* Accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-[#0d6b4e] to-green-500 flex-shrink-0" />

                {/* Mobile handle */}
                <div className="flex justify-center pt-3 sm:hidden flex-shrink-0">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-7 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-0.5">
                      {editingProduct ? "Edit" : "New"}
                    </p>
                    <h2 className="text-2xl font-bold text-blue-500">
                      {editingProduct ? "Edit Product" : "Add Product"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Scrollable form body */}
                <div className="overflow-y-auto flex-1 px-7 pb-2 space-y-4">

                  {/* Helper to build styled inputs */}
                  {/* Product Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Nike Air Max"
                      value={form.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm({ ...form, name: value });
                        if (value) setErrors({ ...errors, name: null });
                      }}
                      className={`w-full px-4 py-2.5 text-sm font-medium border rounded-xl outline-none transition
                        ${errors.name
                          ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
                          : "border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10"
                        }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs pl-1">{errors.name}</p>}
                  </div>

                  {/* Prices row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Cost Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300 pointer-events-none">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.costPrice}
                          onChange={(e) => { setForm({ ...form, costPrice: e.target.value }); setErrors({ ...errors, costPrice: null }); }}
                          className={`w-full pl-7 pr-3 py-2.5 text-sm font-bold border rounded-xl outline-none transition
                            ${errors.costPrice
                              ? "border-red-400 bg-red-50"
                              : "border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10"
                            }`}
                        />
                      </div>
                      {errors.costPrice && <p className="text-red-500 text-xs">{errors.costPrice}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Selling Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300 pointer-events-none">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.sellingPrice}
                          onChange={(e) => { setForm({ ...form, sellingPrice: e.target.value }); setErrors({ ...errors, sellingPrice: null }); }}
                          className={`w-full pl-7 pr-3 py-2.5 text-sm font-bold border rounded-xl outline-none transition
                            ${errors.sellingPrice
                              ? "border-red-400 bg-red-50"
                              : "border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10"
                            }`}
                        />
                      </div>
                      {errors.sellingPrice && <p className="text-red-500 text-xs">{errors.sellingPrice}</p>}
                    </div>
                  </div>

                  {/* Live profit preview */}
                  {form.costPrice && form.sellingPrice && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/[0.04] rounded-xl border border-blue-500/10">
                      <p className="text-xs text-gray-500 font-medium">Profit / Margin</p>
                      <p className={`text-sm font-bold ${
                        Number(form.sellingPrice) >= Number(form.costPrice) ? "text-green-600" : "text-red-500"
                      }`}>
                        {currency.symbol}{(Number(form.sellingPrice) - Number(form.costPrice)).toLocaleString()}
                        {Number(form.costPrice) > 0 && (
                          <span className="ml-1 text-xs opacity-70">
                            ({Math.round(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Quantity</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 outline-none transition"
                    />
                  </div>

                  {/* Category + Department */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500/40 outline-none transition"
                      >
                        <option value="">Select…</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Department</label>
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500/40 outline-none transition"
                      >
                        <option value="">Select…</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Description</label>
                    <textarea
                      placeholder="Optional product notes…"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 outline-none transition resize-none"
                    />
                  </div>

                  {/* Images */}
                  {[
                    { label: "Product Image 1", field: "image"  },
                    { label: "Product Image 2", field: "image2" },
                  ].map(({ label, field }) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</label>
                      <div className="flex items-center gap-3">
                        {form[field] && typeof form[field] === "string" && (
                          <img src={form[field]} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
                        )}
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition text-sm text-gray-400 font-medium">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-gray-300">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                          </svg>
                          {form[field] && typeof form[field] !== "string" ? "Change image" : "Upload image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => setForm({ ...form, [field]: e.target.files[0] })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}

                  {/* Push to marketplace toggle */}
                  <label className="flex items-center gap-4 cursor-pointer select-none p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:border-blue-500/20 transition group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={form.pushToMarketplace}
                        onChange={(e) => setForm({ ...form, pushToMarketplace: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                        form.pushToMarketplace ? "bg-blue-500" : "bg-gray-300"
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          form.pushToMarketplace ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Push to Marketplace</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {form.pushToMarketplace
                          ? "Visible to marketplace customers"
                          : "Hidden from marketplace"}
                      </p>
                    </div>
                  </label>

                </div>

                {/* Footer actions */}
                <div className="px-7 py-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveProduct}
                    disabled={isFormUnchanged()}
                    className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95
                      ${isFormUnchanged()
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-[#051d70] shadow-lg shadow-blue-500/25"
                      }`}
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        {editingProduct ? "Save Changes" : "Add Product"}
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Settings Modal */}
      <LowStockSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </DashboardLayout>
  );
}

