// src/pages/staff/StaffSalesHistory.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
import StaffDashboardLayout from "./StaffDashboardLayout";
import {
    FaCalendarAlt,
    FaFileAlt,
    FaShareAlt,
    FaPrint,
    FaTimes,
    FaSpinner,
    FaReceipt,
    FaChevronDown,
    FaChevronUp,
    FaBoxOpen,
} from "react-icons/fa";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";

const PAGE_SIZE = 20;
const MAX_CUSTOM_DAYS = 90;
const CACHE_KEY = "staff_sales_cache_v1";

/* ─────────────────────────────────────────────────────────────────
   DATE RANGE HELPER
───────────────────────────────────────────────────────────────── */
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
            start = startDate
                ? new Date(startDate + "T00:00:00")
                : new Date("2000-01-01");
            end = endDate
                ? new Date(endDate + "T23:59:59.999")
                : end;
            break;
        default:
            start = new Date("2000-01-01");
    }

    return { start, end };
};

/* ─────────────────────────────────────────────────────────────────
   RECEIPT COMPONENT
───────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────
   RECEIPT MODAL
───────────────────────────────────────────────────────────────── */
function ReceiptModal({ sale, currency, profile, onClose, customer }) {
    const receiptRef = useRef(null);
    const [sharing, setSharing] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);

    const handleShareImage = async () => {
        if (!receiptRef.current) return;
        setSharing(true);
        try {
            const dataUrl = await htmlToImage.toPng(receiptRef.current, {
                backgroundColor: "#ffffff", pixelRatio: 3,
                style: { transform: "none", overflow: "visible" },
            });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `receipt-${sale.id?.slice(-8)}.png`, { type: "image/png" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Receipt - ${profile?.business?.businessName || "Sales Receipt"}`,
                    text: `Receipt for ${currency.symbol}${sale.totalAmount?.toLocaleString()}`,
                    files: [file],
                });
            } else {
                const link = document.createElement("a");
                link.download = `receipt-${sale.id}.png`;
                link.href = dataUrl;
                link.click();
            }
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 3000);
        } catch (err) {
            if (err.name !== "AbortError") alert("Could not share receipt.");
        } finally {
            setSharing(false);
        }
    };

    const handlePrintPDF = async () => {
        if (!receiptRef.current) return;
        setPrinting(true);
        try {
            const dataUrl = await htmlToImage.toPng(receiptRef.current, {
                backgroundColor: "#ffffff", pixelRatio: 3,
                style: { transform: "none", overflow: "visible" },
            });
            const printWindow = window.open("", "_blank", "width=400,height=700");
            if (!printWindow) { alert("Please allow popups to print."); return; }

            printWindow.document.write(`
        <!DOCTYPE html><html><head><title>Receipt</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{display:flex;justify-content:center;background:#f5f5f5;padding:20px}
          img.r{max-width:320px;width:100%;display:block;box-shadow:0 2px 12px rgba(0,0,0,.15)}
          @media print{body{background:#fff;padding:0;display:block}img.r{max-width:100%;box-shadow:none}.np{display:none}}
        </style></head><body>
        <div>
          <img class="r" src="${dataUrl}" alt="Receipt"/>
          <div class="np" style="text-align:center;margin-top:16px">
            <button onclick="window.print()" style="padding:10px 28px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
              🖨️ Print / Save as PDF
            </button>
          </div>
        </div></body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
        } catch (err) {
            alert("Could not prepare receipt for printing.");
        } finally {
            setPrinting(false);
        }
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Receipt Preview</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            #{sale.saleId?.slice(-10).toUpperCase() || sale.id?.toUpperCase()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <FaTimes className="text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[55vh] flex justify-center bg-gray-50 py-4 px-4">
                    <div className="shadow-md rounded">
                        <Receipt ref={receiptRef} sale={sale} currency={currency} profile={profile} customer={customer}/>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                    <button
                        onClick={handleShareImage}
                        disabled={sharing}
                        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition
                            ${shareSuccess ? "bg-green-500 text-white"
                                : sharing ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white"}`}
                    >
                        {sharing ? <><FaSpinner className="animate-spin" /> Generating...</>
                            : shareSuccess ? <>✅ Image Saved!</>
                                : <><FaShareAlt /> Share as Image</>}
                    </button>

                    <button
                        onClick={handlePrintPDF}
                        disabled={printing}
                        className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition
                            ${printing ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                    >
                        {printing ? <><FaSpinner className="animate-spin" /> Preparing PDF...</>
                            : <><FaPrint /> Print / Save as PDF</>}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-2.5 px-4 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition font-medium"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function StaffSalesHistory() {
    const { currency } = useCurrency();
    const { profile } = useProducts();

    const [sales, setSales] = useState(() => {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; }
        catch { return []; }
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

    // ✅ Resolved owner info — staff can only see their own sales
    const [currentUser, setCurrentUser] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [ownerReady, setOwnerReady] = useState(false);

    const [filters, setFilters] = useState({ range: "today", startDate: "", endDate: "" });
    const [dateError, setDateError] = useState("");

    /* ── Resolve auth + ownerId ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setCurrentUser(null);
                setOwnerId(null);
                setOwnerReady(true);
                setSales([]);
                setLoading(false);
                return;
            }

            setCurrentUser(user);

            const userDoc = await getDoc(doc(db, "users", user.uid));
            let resolvedOwnerId = user.uid;

            if (userDoc.exists() && userDoc.data().role === "staff") {
                const businessId = userDoc.data().businessId;
                if (businessId) resolvedOwnerId = businessId;
            }

            setOwnerId(resolvedOwnerId);
            setOwnerReady(true);
        });

        return () => unsub();
    }, []);

    /* ── Fetch when owner is ready ── */
    useEffect(() => {
        if (!ownerReady || !currentUser || !ownerId) return;
        resetAndFetch();
    }, [ownerReady, filters]);

    const resetAndFetch = async () => {
        localStorage.removeItem(CACHE_KEY);
        setSales([]);
        setLastDoc(null);
        setHasMore(true);
        await fetchSales(false);
    };

    const fetchSales = async (nextPage = false) => {
        if (!currentUser || !ownerId) return;
        if (nextPage && (!hasMore || loadingMore)) return;

        nextPage ? setLoadingMore(true) : setLoading(true);

        try {
            const { start, end } = getDateRange(
                filters.range, filters.startDate, filters.endDate
            );
            const startTS = Timestamp.fromDate(start);
            const endTS = Timestamp.fromDate(end);

            // ✅ Staff only fetches from owner's collection
            // Firestore rules enforce soldBy == staff UID on reads
            const baseConstraints = [
                where("createdAt", ">=", startTS),
                where("createdAt", "<=", endTS),
                // ✅ Filter to only this staff member's sales
                where("soldBy", "==", currentUser.uid),
                orderBy("createdAt", "desc"),
                limit(PAGE_SIZE),
            ];

            let q = query(
                collection(db, "sales", ownerId, "userSales"),
                ...baseConstraints
            );

            if (nextPage && lastDoc) {
                q = query(
                    collection(db, "sales", ownerId, "userSales"),
                    ...baseConstraints.slice(0, -1), // remove limit
                    startAfter(lastDoc),
                    limit(PAGE_SIZE)
                );
            }

            const snap = await getDocs(q);
            const newData = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                items: d.data().items || [],
            }));

            setSales((prev) => {
                const updated = nextPage ? [...prev, ...newData] : newData;
                localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
                return updated;
            });

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);

        } catch (err) {
            console.error("Fetch staff sales error:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    /* ── Custom date validation (max 90 days) ── */
    const handleCustomDate = (field, value) => {
        const next = { ...filters, range: "custom", [field]: value };

        if (next.startDate && next.endDate) {
            const diff = (new Date(next.endDate) - new Date(next.startDate)) / (1000 * 60 * 60 * 24);
            if (diff > MAX_CUSTOM_DAYS) {
                setDateError(`Custom range cannot exceed ${MAX_CUSTOM_DAYS} days.`);
                return;
            }
            if (diff < 0) {
                setDateError("End date cannot be before start date.");
                return;
            }
        }

        setDateError("");
        setFilters(next);
    };

    return (
        <StaffDashboardLayout>
            <div className="space-y-6 mb-16">

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            My Sales
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Your personal sales history
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30
                                    flex items-center justify-center">
                        <FaReceipt className="text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                {/* ── Filters ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm
                                border border-gray-100 dark:border-gray-700 p-4 space-y-3">

                    {/* Quick range buttons */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: "today", label: "Today" },
                            { key: "week", label: "This Week" },
                            { key: "month", label: "This Month" },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilters({ range: key, startDate: "", endDate: "" })}
                                className={`px-4 py-2 text-xs font-semibold rounded-xl transition
                                    ${filters.range === key
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date row */}
                    <div className="flex flex-wrap items-center gap-2">
                        <FaCalendarAlt className="text-gray-400 text-sm shrink-0" />
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleCustomDate("startDate", e.target.value)}
                            className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600
                                       bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white
                                       px-3 py-2 rounded-lg text-xs outline-none
                                       focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-400 shrink-0">to</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleCustomDate("endDate", e.target.value)}
                            className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600
                                       bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white
                                       px-3 py-2 rounded-lg text-xs outline-none
                                       focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Date error */}
                    {dateError && (
                        <p className="text-xs text-red-500 font-medium">{dateError}</p>
                    )}

                    {filters.range === "custom" && filters.startDate && filters.endDate && !dateError && (
                        <p className="text-xs text-blue-500">
                            Custom range: {filters.startDate} → {filters.endDate}
                        </p>
                    )}
                </div>

                {/* ── Sales List ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <FaSpinner className="animate-spin text-3xl text-blue-500" />
                    </div>
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800
                                        flex items-center justify-center">
                            <FaBoxOpen className="text-gray-400 text-2xl" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                            No sales found
                        </p>
                        <p className="text-gray-400 dark:text-gray-600 text-sm">
                            Try a different date range
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {sales.map((sale, index) => {
                                const isExpanded = expandedId === sale.id;
                                const saleDate = sale.createdAt?.toDate
                                    ? sale.createdAt.toDate()
                                    : new Date(sale.createdAt?.seconds * 1000);

                                return (
                                    <motion.div
                                        key={sale.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm
                                                   border border-gray-100 dark:border-gray-700
                                                   overflow-hidden"
                                    >
                                        {/* ── Sale Row (clickable) ── */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                                            className="w-full text-left px-4 py-4 flex items-center
                                                       justify-between gap-3 hover:bg-gray-50
                                                       dark:hover:bg-gray-700/50 transition"
                                        >
                                            {/* Left — items summary */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900
                                                              dark:text-white truncate">
                                                    {sale.items.map(i => i.name).join(", ")}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {saleDate.toLocaleDateString()} · {saleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    {" · "}{sale.totalQuantity || sale.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                                                </p>
                                            </div>

                                            {/* Right — total + chevron */}
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-sm font-black text-green-600
                                                                 dark:text-green-400">
                                                    {currency.symbol}{sale.totalAmount?.toLocaleString()}
                                                </span>
                                                {isExpanded
                                                    ? <FaChevronUp className="text-gray-400 text-xs" />
                                                    : <FaChevronDown className="text-gray-400 text-xs" />
                                                }
                                            </div>
                                        </button>

                                        {/* ── Expanded Detail ── */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-gray-100 dark:border-gray-700
                                                                    px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-800/50">

                                                        {/* ✅ Sale ID */}
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                Sale ID
                                                            </span>
                                                            <span className="text-xs font-mono font-bold
                                                                             text-blue-600 dark:text-blue-400
                                                                             bg-blue-50 dark:bg-blue-900/30
                                                                             px-2 py-1 rounded-lg">
                                                                {(sale.saleId || sale.id)?.toUpperCase()}
                                                            </span>
                                                        </div>

                                                        {/* Items breakdown */}
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-semibold text-gray-500
                                                                          dark:text-gray-400 uppercase tracking-wide">
                                                                Items
                                                            </p>
                                                            {sale.items.map((item, i) => {
                                                                const price = item.sellingPrice || item.price || 0;
                                                                return (
                                                                    <div key={i}
                                                                        className="flex items-center justify-between
                                                                                   text-sm py-2 border-b
                                                                                   border-gray-100 dark:border-gray-700
                                                                                   last:border-0">
                                                                        <div>
                                                                            <p className="font-medium text-gray-800
                                                                                          dark:text-white">
                                                                                {item.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-400">
                                                                                {currency.symbol}{price.toLocaleString()} × {item.quantity}
                                                                            </p>
                                                                        </div>
                                                                        <p className="font-bold text-gray-900
                                                                                      dark:text-white">
                                                                            {currency.symbol}{(price * item.quantity).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Total row */}
                                                        <div className="flex justify-between items-center
                                                                        pt-1 border-t border-gray-200
                                                                        dark:border-gray-700">
                                                            <span className="text-sm font-semibold
                                                                             text-gray-700 dark:text-gray-300">
                                                                Total
                                                            </span>
                                                            <span className="text-base font-black
                                                                             text-green-600 dark:text-green-400">
                                                                {currency.symbol}{sale.totalAmount?.toLocaleString()}
                                                            </span>
                                                        </div>

                                                        {/* Receipt button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPendingSale(sale); }}
                                                            className="w-full flex items-center justify-center gap-2
                                                                       py-2.5 rounded-xl text-sm font-semibold
                                                                       bg-white dark:bg-gray-700
                                                                       border border-blue-200 dark:border-blue-800
                                                                       text-blue-700 dark:text-blue-300
                                                                       hover:bg-blue-600 hover:text-white
                                                                       hover:border-blue-600 transition shadow-sm"
                                                        >
                                                            <FaFileAlt size={12} />
                                                            Generate Receipt
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* ── Pagination ── */}
                        <div className="flex justify-center pt-2">
                            {loadingMore ? (
                                <button disabled className="px-6 py-2.5 rounded-xl bg-gray-200
                                                             dark:bg-gray-700 text-gray-400 text-sm font-medium">
                                    Loading...
                                </button>
                            ) : hasMore ? (
                                <button
                                    onClick={() => fetchSales(true)}
                                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
                                               text-white text-sm font-semibold shadow transition"
                                >
                                    Load More
                                </button>
                            ) : (
                                <p className="text-sm text-gray-400">You've reached the end</p>
                            )}
                        </div>
                    </div>
                )}
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
        </StaffDashboardLayout>
    );
}