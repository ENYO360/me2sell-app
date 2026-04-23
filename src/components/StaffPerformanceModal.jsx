import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    orderBy,
    limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    FaTimes,
    FaSpinner,
    FaChartLine,
    FaMoneyBillWave,
    FaShoppingBag,
    FaCalendarDay,
    FaCalendarWeek,
    FaCalendar,
    FaFilter,
    FaBoxOpen,
    FaArrowUp,
    FaTrophy,
} from 'react-icons/fa';

/* ─── helpers ─────────────────────────────────────────────────── */
const toKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
};

const daysBetween = (a, b) =>
    Math.round((b - a) / (1000 * 60 * 60 * 24));

const fmtCurrency = (symbol, val) =>
    `${symbol}${(val || 0).toLocaleString()}`;

/* ─── fetch stats from staffDashboardStats ────────────────────── */
async function fetchStaffStats(staffUid, startDate, endDate) {
    const keys = [];
    let cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
        keys.push(toKey(cursor));
        cursor = addDays(cursor, 1);
    }

    if (keys.length === 0) return { salesCount: 0, revenue: 0, profit: 0, topProducts: {} };

    const CHUNK = 30;
    let salesCount = 0, revenue = 0, profit = 0;
    const topProducts = {};

    for (let i = 0; i < keys.length; i += CHUNK) {
        const chunk = keys.slice(i, i + CHUNK);
        const snap = await getDocs(query(
            collection(db, 'staffDashboardStats', staffUid, 'daily'),
            where('__name__', 'in', chunk),
        ));
        snap.forEach((d) => {
            const data = d.data();
            salesCount += data.salesCount || 0;
            revenue += data.revenue || 0;
            profit += data.profit || 0;

            if (data.topProducts) {
                Object.entries(data.topProducts).forEach(([id, info]) => {
                    if (!topProducts[id]) topProducts[id] = { ...info, quantity: 0, revenue: 0 };
                    topProducts[id].quantity += info.quantity || 0;
                    topProducts[id].revenue += info.revenue || 0;
                });
            }
        });
    }

    return { salesCount, revenue, profit, topProducts };
}

/* ─── fetch 5 most recent sales for this staff member ────────── */
async function fetchRecentSales(businessId, staffUid) {
    const snap = await getDocs(query(
        collection(db, 'sales', businessId, 'userSales'),
        where('soldBy', '==', staffUid),
        orderBy('createdAt', 'desc'),
        limit(5),
    ));

    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
    }));
}

/* ══════════════════════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, sub, color, iconBg }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-2 sm:p-5 shadow-sm
                       border border-gray-100 dark:border-gray-700 flex items-center gap-2 sm:gap-4"
        >
            <div className={`sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className={`text-xl ${color}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">
                    {label}
                </p>
                <p className="sm:text-2xl font-black text-gray-900 dark:text-white truncate">
                    {value}
                </p>
                {sub && (
                    <p className={`text-xs font-semibold mt-0.5 ${color}`}>{sub}</p>
                )}
            </div>
        </motion.div>
    );
}

/* ══════════════════════════════════════════════════════════════
   TOP PRODUCTS TABLE
══════════════════════════════════════════════════════════════ */
function TopProducts({ topProducts, currency }) {
    const sorted = Object.entries(topProducts)
        .map(([id, info]) => ({ id, ...info }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    if (sorted.length === 0) return null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <FaTrophy className="text-amber-500 text-sm" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                    Top Products
                </h3>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                {sorted.map((product, idx) => (
                    <div
                        key={product.id}
                        className={`flex items-center justify-between px-4 py-3
                            ${idx !== sorted.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                            hover:bg-gray-50 dark:hover:bg-gray-700/50 transition`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0
                                ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                                    idx === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                                        idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' :
                                            'bg-blue-50 text-blue-400 dark:bg-blue-900/20 dark:text-blue-500'}`}>
                                {idx + 1}
                            </span>
                            <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                {product.name || product.id}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-2">
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Sold</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">
                                    {product.quantity}
                                </p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-gray-400">Revenue</p>
                                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                    {fmtCurrency(currency.symbol, product.revenue)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   RECENT SALES LIST
══════════════════════════════════════════════════════════════ */
function RecentSalesList({ sales, currency }) {
    if (sales.length === 0) return null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <FaChartLine className="text-blue-500 text-sm" />
                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                    Recent Transactions
                </h3>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100
                            dark:border-gray-700 overflow-hidden shadow-sm">
                {sales.map((sale, idx) => (
                    <div
                        key={sale.id}
                        className={`flex items-center justify-between px-4 py-3
                            ${idx !== sales.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                            hover:bg-gray-50 dark:hover:bg-gray-700/50 transition`}
                    >
                        <div className="min-w-0 flex-1 pr-3">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                {sale.items?.map(i => i.name).join(', ') || '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {sale.createdAt
                                    ? sale.createdAt.toLocaleString([], {
                                        month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })
                                    : '—'}
                                {' · '}
                                {sale.totalQuantity
                                    || sale.items?.reduce((s, i) => s + i.quantity, 0)
                                    || 0} item(s)
                            </p>
                        </div>
                        <span className="text-sm font-black text-green-600 dark:text-green-400 shrink-0">
                            {fmtCurrency(currency.symbol, sale.totalAmount)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   TAB CONFIG
══════════════════════════════════════════════════════════════ */
const TABS = [
    { key: 'today', label: 'Today', icon: FaCalendarDay, activeBg: 'bg-blue-600', color: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-900/30' },
    { key: 'week', label: 'This Week', icon: FaCalendarWeek, activeBg: 'bg-green-600', color: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-50 dark:bg-green-900/30' },
    { key: 'month', label: 'This Month', icon: FaCalendar, activeBg: 'bg-blue-900', color: 'text-blue-900 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-900/30' },
];

/* ══════════════════════════════════════════════════════════════
   MAIN MODAL
══════════════════════════════════════════════════════════════ */
export default function StaffPerformanceModal({ isOpen, onClose, staff, currency }) {
    /* ── state ── */
    const [activeTab, setActiveTab] = useState('today');
    const [presetStats, setPresetStats] = useState({ today: null, week: null, month: null });
    const [customStats, setCustomStats] = useState(null);
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    /* custom range */
    const [showCustom, setShowCustom] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [customError, setCustomError] = useState('');
    const [customApplied, setCustomApplied] = useState(false);
    const [customLoading, setCustomLoading] = useState(false);

    /* business ID (needed for recentSales) */
    const [businessId, setBusinessId] = useState(null);

    const todayStr = toKey(new Date());

    /* ── load preset stats whenever modal opens ── */
    useEffect(() => {
        if (!isOpen || !staff?.id) return;

        // Reset everything on open
        setActiveTab('today');
        setCustomStats(null);
        setCustomApplied(false);
        setCustomStart('');
        setCustomEnd('');
        setCustomError('');
        setShowCustom(false);
        setLoading(true);

        const load = async () => {
            try {
                /* resolve businessId from staff doc */
                const staffSnap = await getDoc(doc(db, 'staff', staff.id));
                const bId = staffSnap.exists() ? staffSnap.data().businessId : null;
                setBusinessId(bId);

                const now = new Date();
                const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startWeek = addDays(startToday, -now.getDay());
                const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                const [todayData, weekData, monthData, recent] = await Promise.all([
                    fetchStaffStats(staff.id, startToday, now),
                    fetchStaffStats(staff.id, startWeek, now),
                    fetchStaffStats(staff.id, startMonth, now),
                    bId ? fetchRecentSales(bId, staff.id) : Promise.resolve([]),
                ]);

                setPresetStats({ today: todayData, week: weekData, month: monthData });
                setRecentSales(recent);
            } catch (err) {
                console.error('StaffPerformanceModal load error:', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [isOpen, staff?.id]);

    /* ── apply custom range ── */
    const applyCustomRange = useCallback(async () => {
        setCustomError('');

        if (!customStart || !customEnd) {
            setCustomError('Please select both a start and end date.');
            return;
        }

        const start = new Date(customStart);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);

        if (start > end) {
            setCustomError('Start date must be before end date.');
            return;
        }

        if (daysBetween(start, end) > 90) {
            setCustomError('Date range cannot exceed 90 days.');
            return;
        }

        setCustomLoading(true);
        try {
            const data = await fetchStaffStats(staff.id, start, end);
            setCustomStats(data);
            setCustomApplied(true);
            setActiveTab('custom');
        } catch (err) {
            console.error('Custom range error:', err);
            setCustomError('Failed to load data. Please try again.');
        } finally {
            setCustomLoading(false);
        }
    }, [customStart, customEnd, staff?.id]);

    const clearCustom = () => {
        setCustomApplied(false);
        setCustomStats(null);
        setCustomStart('');
        setCustomEnd('');
        setCustomError('');
        setShowCustom(false);
        setActiveTab('today');
    };

    if (!isOpen || !staff) return null;

    /* ── active data ── */
    const activeStats = activeTab === 'custom' && customStats
        ? customStats
        : presetStats[activeTab] ?? { salesCount: 0, revenue: 0, profit: 0, topProducts: {} };

    const tab = TABS.find(t => t.key === activeTab);
    const isCustomTab = activeTab === 'custom';

    const tabColor = isCustomTab ? 'text-orange-600 dark:text-orange-400' : tab?.color;
    const tabIconBg = isCustomTab ? 'bg-orange-50 dark:bg-orange-900/30' : tab?.iconBg;

    const roleLabel = staff.role?.replace(/_/g, ' ') ?? 'Staff';

    /* ── profit margin ── */
    const margin = activeStats.revenue > 0
        ? ((activeStats.profit / activeStats.revenue) * 100).toFixed(1)
        : '0.0';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 24 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="bg-gray-50 dark:bg-gray-900 rounded-3xl shadow-2xl
                                   w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
                    >
                        {/* ── Header ── */}
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm
                                                    flex items-center justify-center shrink-0">
                                        <span className="text-white font-black text-xl">
                                            {staff.fullName?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white leading-tight">
                                            {staff.fullName}
                                        </h2>
                                        <p className="text-blue-200 text-xs font-medium mt-0.5 capitalize">
                                            {roleLabel} · {staff.email}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20
                                               flex items-center justify-center transition"
                                >
                                    <FaTimes className="text-white text-sm" />
                                </button>
                            </div>
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex-1 py-3 text-xs font-bold transition
                                        ${activeTab === t.key
                                            ? `${t.activeBg} text-white`
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}

                            {/* Custom tab — shown after applied */}
                            {customApplied && (
                                <button
                                    onClick={() => setActiveTab('custom')}
                                    className={`flex-1 py-3 text-xs font-bold transition
                                        ${activeTab === 'custom'
                                            ? 'bg-orange-500 text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    Custom
                                </button>
                            )}

                            {/* Filter toggle */}
                            <button
                                onClick={() => setShowCustom(v => !v)}
                                className={`px-4 py-3 text-xs transition border-l
                                            border-gray-200 dark:border-gray-700
                                            ${showCustom
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500'
                                        : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                title="Custom date range"
                            >
                                <FaFilter />
                            </button>
                        </div>

                        {/* ── Custom range panel ── */}
                        <AnimatePresence>
                            {showCustom && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden shrink-0"
                                >
                                    <div className="bg-orange-50 dark:bg-orange-900/10
                                                    border-b border-orange-100 dark:border-orange-900/30
                                                    px-5 py-4">
                                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={customStart}
                                                    max={customEnd || todayStr}
                                                    onChange={e => setCustomStart(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border
                                                               border-gray-300 dark:border-gray-600
                                                               bg-white dark:bg-gray-700
                                                               text-gray-900 dark:text-white
                                                               focus:ring-2 focus:ring-orange-400 outline-none"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                                                    End Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={customEnd}
                                                    min={customStart}
                                                    max={todayStr}
                                                    onChange={e => setCustomEnd(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm rounded-xl border
                                                               border-gray-300 dark:border-gray-600
                                                               bg-white dark:bg-gray-700
                                                               text-gray-900 dark:text-white
                                                               focus:ring-2 focus:ring-orange-400 outline-none"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={applyCustomRange}
                                                    disabled={customLoading}
                                                    className="px-4 py-2 text-xs font-bold rounded-xl
                                                               bg-orange-500 hover:bg-orange-600 text-white
                                                               transition disabled:opacity-60
                                                               flex items-center gap-1.5"
                                                >
                                                    {customLoading
                                                        ? <FaSpinner className="animate-spin" />
                                                        : 'Apply'}
                                                </button>
                                                {customApplied && (
                                                    <button
                                                        onClick={clearCustom}
                                                        className="px-4 py-2 text-xs font-bold rounded-xl
                                                                   bg-gray-200 dark:bg-gray-600
                                                                   text-gray-700 dark:text-gray-200
                                                                   hover:bg-gray-300 transition
                                                                   flex items-center gap-1.5"
                                                    >
                                                        <FaTimes /> Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {customError ? (
                                            <p className="mt-2 text-xs font-semibold text-red-500">{customError}</p>
                                        ) : (
                                            <p className="mt-2 text-xs text-gray-400">Maximum range: 90 days</p>
                                        )}

                                        {customApplied && customStart && customEnd && (
                                            <p className="mt-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                                                Showing: {new Date(customStart).toLocaleDateString()} –{' '}
                                                {new Date(customEnd).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Scrollable body ── */}
                        <div className="overflow-y-auto flex-1 p-5 space-y-5">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <FaSpinner className="animate-spin text-3xl text-blue-500" />
                                </div>
                            ) : (
                                <>
                                    {/* ── Stat cards ── */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatCard
                                            icon={FaShoppingBag}
                                            label="Total Sales"
                                            value={activeStats.salesCount ?? 0}
                                            sub={isCustomTab ? `${customStart ? new Date(customStart).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''} – ${customEnd ? new Date(customEnd).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}` : tab?.label}
                                            color={tabColor}
                                            iconBg={tabIconBg}
                                        />
                                        <StatCard
                                            icon={FaMoneyBillWave}
                                            label="Revenue"
                                            value={fmtCurrency(currency.symbol, activeStats.revenue)}
                                            sub="Total collected"
                                            color="text-green-600 dark:text-green-400"
                                            iconBg="bg-green-50 dark:bg-green-900/30"
                                        />
                                        <StatCard
                                            icon={FaArrowUp}
                                            label="Profit"
                                            value={fmtCurrency(currency.symbol, activeStats.profit)}
                                            sub="Net earnings"
                                            color="text-emerald-600 dark:text-emerald-400"
                                            iconBg="bg-emerald-50 dark:bg-emerald-900/30"
                                        />
                                        <StatCard
                                            icon={FaBoxOpen}
                                            label="Profit Margin"
                                            value={`${margin}%`}
                                            sub="Of total revenue"
                                            color="text-indigo-600 dark:text-indigo-400"
                                            iconBg="bg-indigo-50 dark:bg-indigo-900/30"
                                        />
                                    </div>

                                    {/* ── Top products ── */}
                                    {Object.keys(activeStats.topProducts || {}).length > 0 && (
                                        <TopProducts topProducts={activeStats.topProducts} currency={currency} />
                                    )}

                                    {/* ── Recent sales (always from today's preset) ── */}
                                    {recentSales.length > 0 && (
                                        <RecentSalesList sales={recentSales} currency={currency} />
                                    )}

                                    {/* ── Empty state ── */}
                                    {activeStats.salesCount === 0 && (
                                        <div className="text-center py-12">
                                            <FaShoppingBag className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400 font-semibold">
                                                No sales recorded
                                            </p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                                                {isCustomTab ? 'for the selected date range' : `for ${tab?.label.toLowerCase()}`}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700
                                        bg-white dark:bg-gray-800 shrink-0">
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl text-sm font-semibold
                                           text-gray-600 dark:text-gray-300
                                           hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}