// src/components/dashboard/Overview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./O_DashboardLayout.jsx";
import SaleModal from "./SaleModal.jsx";
import ProductImageCarousel from "./ProductImageCarousel.jsx";
import { useSearch } from "../../context/SearchContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { useDirectSale } from "../../context/DirectSaleContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { useProducts } from "../../context/ProductContext.jsx";
import { useDashboard } from "../../context/DashboardContext.jsx";
import { motion } from "framer-motion";
import {
  FaShoppingCart, FaBox, FaMoneyBillWave,
  FaHistory, FaTrophy, FaBoxOpen, FaChevronRight,
  FaCalendarAlt,
} from "react-icons/fa";

// ── Shared product card (search results) ─────────────────────────────────────
function ProductCard({ product, currency, addToCart, startSale, lowStockThreshold, adding }) {
  const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
  const isOut = product.quantity === 0;

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden shadow-sm transition-all
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
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-300 line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Qty: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"}`}>{product.quantity}</span></span>
          <span className="font-black text-[#03165A] dark:text-gray-300">{currency.symbol}{product.sellingPrice.toLocaleString()}</span>
        </div>
        {isOut ? (
          <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">Out of Stock</div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => addToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 dark:border rounded-xl hover:text-sm text-gray-800 dark:text-gray-400 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              {adding === product.id ? (
                <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              ) : (
                <><FaShoppingCart className="text-[10px]" /> Add</>
              )}
            </button>
            <button onClick={() => startSale(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 dark:border rounded-xl hover:text-sm text-gray-800 dark:text-gray-400 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaMoneyBillWave className="text-[10px]" /> Sell
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Overview() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ salesRange: "day" });
  const [stats, setStats] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const { results, setScope } = useSearch();
  const { addToCart, adding } = useCart();
  const { startSale } = useDirectSale();
  const { currency } = useCurrency();
  const { products, lowStockThreshold } = useProducts();
  const { getStatsByRange, getStatsByCustomRange, loading } = useDashboard();

  useEffect(() => { setScope("all-products"); }, []);

  useEffect(() => {
    const load = async () => {
      const result = await getStatsByRange(filters.salesRange);
      setStats(result);
      setCustomMode(false);
    };
    load();
  }, [filters.salesRange]);

  const applyCustomFilter = async () => {
    if (!customRange.start || !customRange.end) return;
    const start = new Date(customRange.start);
    const end = new Date(customRange.end);
    if ((end - start) / (1000 * 60 * 60 * 24) > 90) {
      alert("Please select a range of 90 days or less.");
      return;
    }
    const result = await getStatsByCustomRange(start, end);
    setStats(result);
    setCustomMode(true);
  };

  const inStock = products.filter((p) => p.quantity > 0).length;
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const outOfStock = products.filter((p) => p.quantity === 0).length;
  const inStockAmount = products
    .filter((p) => Number(p.quantity) > 0)
    .reduce((sum, p) => sum + Number(p.quantity) * Number(p.costPrice || 0), 0);

  const dashboard = stats ?? {
    salesCount: 0, salesAmount: 0, profitAmount: 0, topProduct: null,
    inStock, lowStock, outOfStock, inStockAmount,
  };

  const RANGES = [
    { value: "day", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  // ── Search results view ─────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#03165A] dark:text-[#163bbf]">Search Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{results.length} product{results.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency}
                addToCart={addToCart} startSale={startSale} lowStockThreshold={lowStockThreshold} adding={adding} />
            ))}
          </div>
        </div>
        <SaleModal />
      </DashboardLayout>
    );
  }

  // ── Overview view ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16">

        {/* ── PAGE HEADER ── */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#03165A] dark:text-[#163bbf]">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Sales and inventory at a glance</p>
        </div>

        {/* ── RANGE CONTROLS ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-500 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />
          <div className="p-5 space-y-4">

            {/* Preset range pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 mr-1">Range</span>
              {RANGES.map((r) => (
                <button key={r.value} onClick={() => setFilters({ ...filters, salesRange: r.value })}
                  className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${filters.salesRange === r.value && !customMode
                    ? "bg-blue-500 text-white shadow-md shadow-[#03165A]/20"
                    : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500"
                    }`}>
                  {r.label}
                </button>
              ))}
              {customMode && (
                <button
                  onClick={async () => { const r = await getStatsByRange(filters.salesRange); setStats(r); setCustomMode(false); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 transition"
                >
                  ✕ Clear Custom
                </button>
              )}
            </div>

            {/* Custom date range */}
            <div className="flex flex-wrap gap-3 items-end border-t border-gray-200 dark:border-gray-500 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                  <FaCalendarAlt className="text-[10px]" /> Start Date
                </label>
                <input type="date" value={customRange.start}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-500 focus:bg-white focus:border-[#03165A]/40 outline-none transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                  <FaCalendarAlt className="text-[10px]" /> End Date
                </label>
                <input type="date" value={customRange.end}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-500 focus:bg-white focus:border-[#03165A]/40 outline-none transition" />
              </div>
              <button onClick={applyCustomFilter} disabled={loading || !customRange.start || !customRange.end}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-[#051d70] text-white text-sm font-bold transition shadow-md shadow-[#03165A]/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                {loading ? <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" /> : "Apply"}
              </button>
            </div>

            {customMode && customRange.start && customRange.end && (
              <p className="text-xs text-[#03165A] font-semibold bg-blue-500/[0.04] px-3 py-1.5 rounded-lg border border-[#03165A]/10 w-fit">
                📅 Showing: {new Date(customRange.start).toLocaleDateString()} – {new Date(customRange.end).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* ── SALES STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

          {/* Total Sales */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-500 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-green-400 to-green-600" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Sales</p>
                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900 flex items-center justify-center">
                  <FaShoppingCart className="text-green-500 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-300">{dashboard.salesCount}</p>
              <p className="text-lg font-bold text-green-600">{currency?.symbol}{Number(dashboard.salesAmount || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                {customMode ? "Custom range" : RANGES.find((r) => r.value === filters.salesRange)?.label}
              </p>
            </div>
          </motion.div>

          {/* Total Profit */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-500 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Profit</p>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900 flex items-center justify-center">
                  <FaMoneyBillWave className="text-amber-500 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-600">{currency?.symbol}{Number(dashboard.profitAmount || 0).toLocaleString()}</p>
              <p className="text-3xl font-black text-gray-900">&nbsp;</p>
              <p className="text-[10px] text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                {customMode ? "Custom range" : RANGES.find((r) => r.value === filters.salesRange)?.label}
              </p>
            </div>
          </motion.div>

          {/* Top Product */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-500 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#03165A] to-purple-500" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Top Product</p>
                <div className="w-8 h-8 rounded-xl bg-blue-500/8 flex dark:bg-blue-900 items-center justify-center">
                  <FaTrophy className="text-[#03165A] dark:text-[#1744e9] text-sm" />
                </div>
              </div>
              {!dashboard.topProduct ? (
                <p className="text-sm text-gray-300 dark:text-gray-400 pt-2">No sales in this range</p>
              ) : (
                <>
                  <p className="font-bold text-gray-900 dark:text-gray-400 text-base leading-tight line-clamp-2">{dashboard.topProduct.name}</p>
                  <p className="text-xs text-gray-500">Sold: <span className="font-semibold text-gray-700">{dashboard.topProduct.quantity}</span></p>
                  <p className="text-lg font-bold text-green-600">{currency?.symbol}{Number(dashboard.topProduct.revenue).toLocaleString()}</p>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── INVENTORY CARDS ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Inventory</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "In Stock", value: inStock, sub: `${currency.symbol}${inStockAmount.toLocaleString()} value`,
                icon: FaBox, iconBg: "bg-blue-50 dark:bg-blue-900", iconColor: "text-[#03165A] dark:text-[#1744e9]",
                accent: "from-[#03165A] to-[#03165A]/60", valueCls: "text-[#03165A] dark:text-[#1744e9]",
              },
              {
                label: "Low Stock", value: lowStock, sub: `≤ ${lowStockThreshold} units`,
                icon: FaHistory, iconBg: "bg-amber-50 dark:bg-amber-900", iconColor: "text-amber-500 dark:text-amber-400",
                accent: "from-amber-400 to-amber-500", valueCls: "text-amber-600",
              },
              {
                label: "Out of Stock", value: outOfStock, sub: "needs restocking",
                icon: FaShoppingCart, iconBg: "bg-red-50 dark:bg-red-900", iconColor: "text-red-500 dark:text-red-400",
                accent: "from-red-400 to-red-500", valueCls: "text-red-500",
              },
            ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, accent, valueCls }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => navigate("/dashboard/products")}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-500 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-[#03165A]/15 transition-all group"
              >
                <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
                      <Icon className={`${iconColor} text-xs`} />
                    </div>
                    <FaChevronRight className="text-[10px] text-gray-300 dark:text-gray-400 group-hover:text-gray-400 dark:group-hover:text-gray-300 transition" />
                  </div>
                  <p className={`text-2xl sm:text-3xl font-black ${valueCls}`}>{value}</p>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-400">{label}</p>
                    <p className="text-[11px] text-gray-700 dark:text-gray-400 mt-0.5 truncate">{sub}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
      <SaleModal />
    </DashboardLayout>
  );
}