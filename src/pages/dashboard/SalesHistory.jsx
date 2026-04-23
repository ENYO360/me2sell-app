import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../firebase/config";
import ProductImageCarousel from "./ProductImageCarousel";
import Logo from "../../images/me2sell-logo.png";
import * as htmlToImage from "html-to-image";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore";

import DashboardLayout from "./O_DashboardLayout";
import SaleModal from "./SaleModal";

import {
  FaCalendarAlt,
  FaShoppingCart,
  FaMoneyBillWave,
  FaFileAlt,
  FaShareAlt,
  FaPrint,
  FaTimes,
  FaSpinner,
} from "react-icons/fa";

import { useSearch } from "../../context/SearchContext";
import { useCart } from "../../context/CartContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";

const PAGE_SIZE = 20;
const CACHE_KEY = "sales_cache_v1";

/* ===============================
   DATE RANGE HELPER
================================*/
const getDateRange = (range, startDate, endDate) => {
  const now = new Date();
  let start, end;

  end = new Date();
  end.setHours(23, 59, 59, 999);

  switch (range) {
    case "today":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start = new Date();
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      start = startDate ? new Date(startDate + "T00:00:00") : new Date("2000-01-01");
      end = endDate ? new Date(endDate + "T23:59:59.999") : end;
      break;
    default:
      start = new Date();
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
};

/* ===============================
   RECEIPT COMPONENT
   Separate component so ref works
================================*/
const Receipt = React.forwardRef(({ sale, currency, profile, customer }, ref) => {
  if (!sale) return null;

  const saleDate = sale.createdAt?.toDate
    ? sale.createdAt.toDate()
    : new Date(sale.createdAt?.seconds * 1000);

  const subtotal = sale.items.reduce(
    (sum, item) => sum + item.quantity * (item.sellingPrice || item.price || 0),
    0
  );

  return (
    <div
      ref={ref}
      style={{
        width: "360px",
        backgroundColor: "#ffffff",
        color: "#111111",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ---- HEADER ---- */}
      <div style={{ backgroundColor: "ffffff", padding: "24px 24px 20px", display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px", paddingRight: "10px" }}>
            {profile?.business?.businessName || "My Business"}
          </div>
          <div style={{ fontSize: "9px", color: "#8fa8d8", marginTop: "2px" }}>
            {profile?.business?.businessType || ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#404040", textTransform: "uppercase", letterSpacing: "1px" }}>Invoice ID.</div>
          <div style={{ fontSize: "8px", color: "#404040", fontWeight: "600", marginTop: "2px" }}>
            #{(sale.saleId || sale.id)?.slice(-10).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ---- RECEIPT TITLE BAR ---- */}
      <div style={{ backgroundColor: "#ced9fd", padding: "12px 24px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "#404040", letterSpacing: "3px" }}>INVOICE</div>
      </div>

      {/* ---- DATE ROW ---- */}
      <div style={{ padding: "12px 24px", borderBottom: "0.5px solid #e5e7eb" }}>
        <span style={{ fontSize: "10px", color: "#6b7280" }}>Date: </span>
        <span style={{ fontSize: "10px", fontWeight: "600", color: "#111" }}>
          {saleDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
        <span style={{ fontSize: "10px", color: "#6b7280", marginLeft: "16px" }}>Time: </span>
        <span style={{ fontSize: "10px", fontWeight: "600", color: "#111" }}>
          {saleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* ---- BILLED TO / FROM ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "0.5px solid #e5e7eb" }}>
        {/* Billed To */}
        <div style={{ padding: "14px 24px", borderRight: "0.5px solid #e5e7eb" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#03165A", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
            Billed to
          </div>
          <div style={{ fontSize: "10px", fontWeight: "400", color: "#111" }}>
            {customer?.name || "Customer"}
          </div>
          {customer?.phone && (
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              {customer.phone}
            </div>
          )}
        </div>
        {/* From */}
        <div style={{ padding: "14px 24px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", color: "#03165A", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
            From
          </div>
          <div style={{ fontSize: "10px", fontWeight: "400", color: "#111" }}>
            {profile?.business?.businessName || "My Business"}
          </div>
          {profile?.business?.businessAddress && (
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              {profile.business.businessAddress}
            </div>
          )}
          {profile?.admin?.phone?.full && (
            <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
              Tel: {profile.admin.phone.full}
            </div>
          )}
        </div>
      </div>

      {/* ---- ITEMS TABLE ---- */}
      <div style={{ padding: "0 24px" }}>
        {/* Table Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "10px", fontWeight: "700", textTransform: "uppercase",
          letterSpacing: "0.8px", color: "#03165A",
          borderBottom: "1.5px solid #03165A",
          padding: "12px 0 8px",
        }}>
          <span style={{ flex: 2 }}>Item</span>
          <span style={{ flex: 1, textAlign: "center" }}>Qty</span>
          <span style={{ flex: 1, textAlign: "right" }}>Rate</span>
          <span style={{ flex: 1, textAlign: "right" }}>Amount</span>
        </div>

        {/* Table Rows */}
        {sale.items.map((item, i) => {
          const price = item.sellingPrice || item.price || 0;
          const lineTotal = item.quantity * price;
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px", color: "#333",
              padding: "9px 0",
              borderBottom: "0.5px solid #f0f0f0",
            }}>
              <span style={{ flex: 2, fontWeight: "600", fontSize: "13px" }}>{item.name}</span>
              <span style={{ flex: 1, textAlign: "center", color: "#6b7280" }}>{item.quantity}</span>
              <span style={{ flex: 1, textAlign: "right", color: "#6b7280" }}>{currency.symbol}{price.toLocaleString()}</span>
              <span style={{ flex: 1, textAlign: "right", fontWeight: "600" }}>{currency.symbol}{lineTotal.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* ---- TOTALS ---- */}
      <div style={{ padding: "0 24px" }}>
        {/* Subtotal */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", padding: "10px 0 4px" }}>
          <span>Subtotal</span>
          <span>{currency.symbol}{subtotal.toLocaleString()}</span>
        </div>

        {sale.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#e53e3e", paddingBottom: "4px" }}>
            <span>Discount</span>
            <span>-{currency.symbol}{sale.discount.toLocaleString()}</span>
          </div>
        )}

        {/* Total */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderTop: "1.5px solid #03165A",
          padding: "12px 0 14px",
          gap: "40px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>Total</span>
          <span style={{ fontSize: "20px", fontWeight: "700", color: "#03165A" }}>
            {currency.symbol}{sale.totalAmount?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ---- META ROW ---- */}
      <div style={{ display: "flex", gap: "24px", padding: "10px 24px 14px", borderTop: "0.5px solid #e5e7eb" }}>
        {sale.paymentMethod && (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Payment: <span style={{ color: "#111", fontWeight: "600", textTransform: "capitalize" }}>{sale.paymentMethod}</span>
          </div>
        )}
        {(sale.staffName || sale.soldBy) && (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Cashier: <span style={{ color: "#111", fontWeight: "600" }}>{sale.staffName || "Admin"}</span>
          </div>
        )}
      </div>

      {/* ---- FOOTER NOTE ---- */}
      <div style={{ textAlign: "center", fontSize: "11px", color: "#6b7280", padding: "8px 24px 0", fontStyle: "italic" }}>
        Thank you for your patronage — items sold are not returnable.
      </div>

      {/* ---- WAVE FOOTER ---- */}
      <div style={{ marginTop: "16px", position: "relative", height: "52px", overflow: "hidden" }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "70px", backgroundColor: "#03165A",
          borderRadius: "60% 60% 0 0 / 100% 100% 0 0",
        }} />
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: "45%", height: "60px", backgroundColor: "#4a5568",
          borderRadius: "60% 0 0 0 / 100% 0 0 0",
        }} />
        <div style={{
          position: "absolute", display: "flex", justifyContent: "center", bottom: "8px", left: 0, right: 0,
          textAlign: "center", fontSize: "10px", color: "#8fa8d8", zIndex: 1,
        }}>
          Powered by: <img src={Logo} alt="me2sell" style={{ display: "inline-block", height: "14px", marginBottom: "-2px" }} />
        </div>
      </div>
    </div>
  );
});

Receipt.displayName = "Receipt";

// Customer Info Modal — collects optional customer details before showing receipt
function CustomerInfoModal({ onConfirm, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = () => {
    onConfirm({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Customer Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">For the receipt, both fields are optional</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#03165A]/30 focus:border-[#03165A]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +234 800 000 0000"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#03165A]/30 focus:border-[#03165A]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-900 text-white text-sm font-semibold transition"
          >
            Continue to Receipt
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ===============================
   RECEIPT MODAL COMPONENT
================================*/
function ReceiptModal({ sale, currency, profile, logoSrc, onClose, customer }) {
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Share as Image — uses Web Share API if available, falls back to download
  const handleShareImage = async () => {
    if (!receiptRef.current) return;
    setSharing(true);

    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        // Ensures full height is captured
        style: {
          transform: "none",
          overflow: "visible",
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `receipt-${sale.id}.png`, {
        type: "image/png",
      });

      // Try Web Share API first (works on mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt - ${profile?.business?.businessName || "Sales Receipt"}`,
          text: `Sales receipt for ${sale.totalAmount ? `${currency.symbol}${sale.totalAmount.toLocaleString()}` : ""}`,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        // Fallback: download the image
        const link = document.createElement("a");
        link.download = `receipt-${sale.id?.slice(-8)}.png`;
        link.href = dataUrl;
        link.click();
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
        alert("Could not share receipt. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  // 🔥 Print as PDF — renders receipt in a clean print window
  const handlePrintPDF = async () => {
    if (!receiptRef.current) return;
    setPrinting(true);

    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        style: {
          transform: "none",
          overflow: "visible",
        },
      });

      const printWindow = window.open("", "_blank", "width=400,height=700");
      if (!printWindow) {
        alert("Please allow popups to print the receipt.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${sale.id?.slice(-10).toUpperCase()}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
                background: #f5f5f5;
                padding: 20px;
              }
              img.receipt-img {
                max-width: 320px;
                width: 100%;
                display: block;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                  display: block;
                }
                img.receipt-img {
                  max-width: 100%;
                  box-shadow: none;
                }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div>
              <img class="receipt-img" src="${dataUrl}" alt="Receipt" />
              <div class="no-print" style="text-align:center; margin-top: 16px;">
                <button
                  onclick="window.print()"
                  style="
                    padding: 10px 28px;
                    background: #1d4ed8;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                  "
                >
                  🖨️ Print / Save as PDF
                </button>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      // Auto-trigger print after image loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } catch (err) {
      console.error("Print failed:", err);
      alert("Could not prepare receipt for printing.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Receipt Preview</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                #{sale.id?.slice(-10).toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>

          {/* Receipt Preview — scrollable */}
          <div className="overflow-y-auto max-h-[55vh] flex justify-center bg-gray-50 py-4 px-4">
            <div className="shadow-md rounded">
              <Receipt
                ref={receiptRef}
                sale={sale}
                currency={currency}
                profile={profile}
                logoSrc={logoSrc}
                customer={customer}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            {/* Share as Image */}
            <button
              onClick={handleShareImage}
              disabled={sharing}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition ${shareSuccess
                ? "bg-green-500 text-white"
                : sharing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                }`}
            >
              {sharing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Generating Image...
                </>
              ) : shareSuccess ? (
                <>✅ Image Saved!</>
              ) : (
                <>
                  <FaShareAlt />
                  Share as Image
                </>
              )}
            </button>

            {/* Print PDF */}
            <button
              onClick={handlePrintPDF}
              disabled={printing}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition ${printing
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                }`}
            >
              {printing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Preparing PDF...
                </>
              ) : (
                <>
                  <FaPrint />
                  Print / Save as PDF
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Shared product card (search results) ─────────────────────────────────────
function ProductCard({ product, currency, addToCart, startSale, lowStockThreshold, adding }) {
  const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
  const isOut = product.quantity === 0;

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
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
        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Qty: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"}`}>{product.quantity}</span></span>
          <span className="font-black text-[#03165A]">{currency.symbol}{product.sellingPrice.toLocaleString()}</span>
        </div>
        {isOut ? (
          <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">Out of Stock</div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => addToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              {adding === product.id ? (
                <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              ) : (
                <><FaShoppingCart className="text-[10px]" /> Add</>
              )}
            </button>
            <button onClick={() => startSale(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaMoneyBillWave className="text-[10px]" /> Sell
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ===============================
   MAIN COMPONENT
================================*/
export default function SalesHistory() {
  const [sales, setSales] = useState(() => {
    const cache = localStorage.getItem(CACHE_KEY);
    return cache ? JSON.parse(cache) : [];
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Receipt modal state
  const [pendingSale, setPendingSale] = useState(null); // waiting for customer info
  const [receiptSale, setReceiptSale] = useState(null); // ready to show receipt
  const [customer, setCustomer] = useState(null); // { name, phone }

  const [filters, setFilters] = useState({
    range: "today",
    startDate: "",
    endDate: "",
  });

  const { setScope, results } = useSearch();
  const { addToCart, adding } = useCart();
  const { startSale } = useDirectSale();
  const { currency } = useCurrency();
  const { products, lowStockThreshold, profile } = useProducts();

  useEffect(() => {
    setScope("all-products");
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) resetAndFetch(user.uid);
      else setSales([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) resetAndFetch(user.uid);
  }, [filters]);

  const resetAndFetch = async (uid) => {
    localStorage.removeItem(CACHE_KEY);
    setSales([]);
    setLastDoc(null);
    setHasMore(true);
    await fetchSales(uid, false);
  };

  const fetchSales = async (uid, nextPage = false) => {
    if (!uid || loadingMore || (!hasMore && nextPage)) return;

    nextPage ? setLoadingMore(true) : setLoading(true);

    try {
      const { start, end } = getDateRange(filters.range, filters.startDate, filters.endDate);
      const startTS = Timestamp.fromDate(start);
      const endTS = Timestamp.fromDate(end);

      let q = query(
        collection(db, "sales", uid, "userSales"),
        where("createdAt", ">=", startTS),
        where("createdAt", "<=", endTS),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (nextPage && lastDoc) {
        q = query(
          collection(db, "sales", uid, "userSales"),
          where("createdAt", ">=", startTS),
          where("createdAt", "<=", endTS),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newData = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        items: doc.data().items || [],
      }));

      setSales((prev) => {
        const updated = nextPage ? [...prev, ...newData] : newData;
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Fetch sales error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const user = auth.currentUser;
    if (user) fetchSales(user.uid, true);
  };

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

  const searchActive = results.length > 0;
  const displayList = searchActive ? results : products;

  return (
    <DashboardLayout>
      <div className="md:p-6 mb-12">
        <>
          {/* ========== FILTERS ========== */}
          <div className="flex flex-col gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-[#03165A] dark:text-[#163bbf]">
              Sales History
            </h2>

            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border dark:border-slate-700">
              {["today", "week", "month"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilters({ range: r, startDate: "", endDate: "" })}
                  className={`px-3 py-1.5 text-xs md:text-sm rounded-md font-medium transition ${filters.range === r
                    ? "bg-blue-600 text-white shadow"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                >
                  {r === "today" ? "Today" : r === "week" ? "This Week" : r === "month" ? "This Month" : "All"}
                </button>
              ))}

              <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
              <FaCalendarAlt className="text-gray-500 text-sm md:text-base" />

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, range: "custom", startDate: e.target.value })}
                className="border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded-md text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs md:text-sm text-gray-500">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, range: "custom", endDate: e.target.value })}
                className="border dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded-md text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ========== TABLE ========== */}
          {loading ? (
            <p className="text-center text-sm text-gray-500 mt-10">Loading sales...</p>
          ) : sales.length === 0 ? (
            <p className="text-center text-sm text-gray-500 mt-10">No sales found.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl shadow border dark:border-slate-700">
                <table className="w-full bg-white dark:bg-slate-800 text-xs md:text-sm">
                  <thead className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Item</th>
                      <th className="px-3 py-2 text-center font-semibold">Qty</th>
                      <th className="px-3 py-2 text-center font-semibold">Rate</th>
                      <th className="px-3 py-2 text-center font-semibold">Total</th>
                      <th className="px-3 py-2 text-center font-semibold">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y dark:divide-slate-700">
                    {sales.map((sale) => (
                      <React.Fragment key={sale.id}>
                        <tr
                          onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                          className="hover:bg-gray-50 cursor-pointer dark:hover:bg-slate-700 transition"
                        >
                          <td className="px-3 py-2 align-top text-gray-800 dark:text-gray-200">
                            {sale.items.map((i, idx) => (
                              <div key={idx} className="line-clamp-3 max-w-[120px] md:max-w-none">
                                {i.name}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">
                            {sale.items.map((i, idx) => <div key={idx}>{i.quantity}</div>)}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-200">
                            {sale.items.map((i, idx) => (
                              <div key={idx}>{currency.symbol}{(i.sellingPrice || i.price)?.toLocaleString()}</div>
                            ))}
                          </td>
                          <td className="px-2 py-2 text-center font-semibold text-green-600 dark:text-green-400">
                            {currency.symbol}{sale.totalAmount?.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 whitespace-break-spaces">
                            {sale.createdAt?.toDate
                              ? sale.createdAt.toDate().toLocaleString()
                              : new Date(sale.createdAt?.seconds * 1000).toLocaleString()}
                          </td>
                        </tr>

                        {/* 🔥 EXPANDED ROW */}
                        {expandedId === sale.id && (
                          <tr className="bg-blue-50 dark:bg-slate-700">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">

                                {/* ── Sale metadata ── */}
                                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                                  {/* Sale ID */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-gray-500 dark:text-gray-400">Sale ID:</span>
                                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300
                                                       bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                                      {(sale.saleId || sale.id)}
                                    </span>
                                  </div>

                                  {/* Sold by */}
                                  {sale.staffName ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-500 dark:text-gray-400">Sold by:</span>
                                      <span className="font-semibold text-purple-700 dark:text-purple-300
                                                         bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                                        {sale.staffName}
                                      </span>
                                      <span className="text-gray-400 dark:text-gray-500 italic">(Staff)</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-500 dark:text-gray-400">Sold by:</span>
                                      <span className="font-semibold text-green-700 dark:text-green-300
                                                         bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded">
                                        You (Admin)
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* ── Generate Receipt button ── */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPendingSale(sale); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-600
                                               border border-blue-200 dark:border-slate-500
                                               text-blue-700 dark:text-blue-300
                                               hover:bg-blue-600 hover:text-white hover:border-blue-600
                                               rounded-lg text-sm font-semibold transition shadow-sm"
                                >
                                  <FaFileAlt className="text-xs" />
                                  Generate Receipt
                                </button>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ========== PAGINATION ========== */}
              <div className="flex justify-center mt-6">
                {loadingMore ? (
                  <button disabled className="bg-gray-400 px-5 py-2 rounded-lg text-white text-sm">
                    Loading...
                  </button>
                ) : hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg text-white text-sm shadow transition"
                  >
                    Load More
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">No more sales</span>
                )}
              </div>
            </>
          )}
        </>

        <SaleModal />
      </div>

      {/* CUSTOMER INFO MODAL — step 1 */}
      {pendingSale && (
        <AnimatePresence>
          <CustomerInfoModal
            onConfirm={(info) => {
              setCustomer(info);
              setReceiptSale(pendingSale);
              setPendingSale(null);
            }}
            onClose={() => setPendingSale(null)}
          />
        </AnimatePresence>
      )}

      {/* RECEIPT MODAL — step 2 */}
      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          currency={currency}
          profile={profile}
          logoSrc={Logo}
          customer={customer}
          onClose={() => { setReceiptSale(null); setCustomer(null); }}
        />
      )}
    </DashboardLayout>
  );
}