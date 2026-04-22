// src/pages/staff/StaffDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import StaffDashboardLayout from './StaffDashboardLayout';
import { auth, db } from '../../firebase/config';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { usePermissions } from '../../hooks/usePermissions';
import { useCurrency } from '../../context/CurrencyContext';
import { Link } from 'react-router-dom';
import {
    FaBox,
    FaShoppingCart,
    FaHistory,
    FaCalendarDay,
    FaCalendarWeek,
    FaCalendar,
    FaSpinner,
    FaFilter,
    FaTimes,
    FaChartLine,
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

/* ─── fetch staffDashboardStats for a date range ─────────────── */
async function fetchStaffStats(staffUid, startDate, endDate) {
    /* Build array of date keys between startDate and endDate (inclusive) */
    const keys = [];
    let cursor = new Date(startDate);
    const end  = new Date(endDate);
    while (cursor <= end) {
        keys.push(toKey(cursor));
        cursor = addDays(cursor, 1);
    }

    if (keys.length === 0) return { salesCount: 0, revenue: 0, profit: 0, topProducts: {} };

    /* Firestore `in` supports max 30 per query — batch if needed */
    const CHUNK = 30;
    const chunks = [];
    for (let i = 0; i < keys.length; i += CHUNK) {
        chunks.push(keys.slice(i, i + CHUNK));
    }

    let salesCount = 0, revenue = 0, profit = 0;
    const topProducts = {};

    await Promise.all(
        chunks.map(async (chunk) => {
            const snap = await getDocs(query(
                collection(db, 'staffDashboardStats', staffUid, 'daily'),
                where('__name__', 'in', chunk),
            ));
            snap.forEach((d) => {
                const data = d.data();
                salesCount += data.salesCount || 0;
                revenue    += data.revenue    || 0;
                profit     += data.profit     || 0;

                if (data.topProducts) {
                    Object.entries(data.topProducts).forEach(([id, info]) => {
                        if (!topProducts[id]) {
                            topProducts[id] = { ...info, quantity: 0, revenue: 0 };
                        }
                        topProducts[id].quantity += info.quantity || 0;
                        topProducts[id].revenue  += info.revenue  || 0;
                    });
                }
            });
        })
    );

    return { salesCount, revenue, profit, topProducts };
}

/* ─── recent sales still come from the sales collection ──────── */
async function fetchRecentSales(businessId, staffUid) {
    const { getDocs: gd, query: q, collection: col, where: w,
            orderBy: ob, limit: lim, Timestamp } =
        await import('firebase/firestore');

    const snap = await gd(q(
        col(db, 'sales', businessId, 'userSales'),
        w('soldBy', '==', staffUid),
        ob('createdAt', 'desc'),
        lim(5),
    ));

    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
    }));
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
    const { currency }    = useCurrency();
    const { permissions } = usePermissions();

    const [staffName,  setStaffName]  = useState('');
    const [staffUid,   setStaffUid]   = useState(null);
    const [businessId, setBusinessId] = useState(null);

    /* ── preset tab ── */
    const [activeTab, setActiveTab] = useState('today');

    /* ── custom range ── */
    const [showCustom,    setShowCustom]    = useState(false);
    const [customStart,   setCustomStart]   = useState('');
    const [customEnd,     setCustomEnd]     = useState('');
    const [customError,   setCustomError]   = useState('');
    const [customApplied, setCustomApplied] = useState(false);

    /* ── stats & UI ── */
    const [presetStats, setPresetStats] = useState({
        today:  { salesCount: 0, revenue: 0, profit: 0 },
        week:   { salesCount: 0, revenue: 0, profit: 0 },
        month:  { salesCount: 0, revenue: 0, profit: 0 },
    });
    const [customStats,  setCustomStats]  = useState(null);
    const [recentSales,  setRecentSales]  = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [customLoading, setCustomLoading] = useState(false);

    /* ── resolve auth once ── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { setLoading(false); return; }

            try {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (!userSnap.exists()) { setLoading(false); return; }

                const bId = userSnap.data().businessId;
                if (!bId)  { setLoading(false); return; }

                const staffSnap = await getDoc(doc(db, 'staff', user.uid));
                if (staffSnap.exists()) setStaffName(staffSnap.data().fullName || '');

                setStaffUid(user.uid);
                setBusinessId(bId);
            } catch (err) {
                console.error('StaffDashboard auth error:', err);
                setLoading(false);
            }
        });
        return () => unsub();
    }, []);

    /* ── load preset stats once we have staffUid ── */
    useEffect(() => {
        if (!staffUid || !businessId) return;

        const load = async () => {
            setLoading(true);
            try {
                const now          = new Date();
                const startToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startWeek    = addDays(startToday, -now.getDay());
                const startMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

                const [todayData, weekData, monthData, recent] = await Promise.all([
                    fetchStaffStats(staffUid, startToday, now),
                    fetchStaffStats(staffUid, startWeek,  now),
                    fetchStaffStats(staffUid, startMonth, now),
                    fetchRecentSales(businessId, staffUid),
                ]);

                setPresetStats({
                    today: todayData,
                    week:  weekData,
                    month: monthData,
                });
                setRecentSales(recent);
            } catch (err) {
                console.error('StaffDashboard load error:', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [staffUid, businessId]);

    /* ── apply custom date range ── */
    const applyCustomRange = useCallback(async () => {
        setCustomError('');

        if (!customStart || !customEnd) {
            setCustomError('Please select both a start and end date.');
            return;
        }

        const start = new Date(customStart);
        const end   = new Date(customEnd);
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
            const data = await fetchStaffStats(staffUid, start, end);
            setCustomStats(data);
            setCustomApplied(true);
            setActiveTab('custom');
        } catch (err) {
            console.error('Custom range error:', err);
            setCustomError('Failed to load data. Please try again.');
        } finally {
            setCustomLoading(false);
        }
    }, [customStart, customEnd, staffUid]);

    const clearCustom = () => {
        setCustomApplied(false);
        setCustomStats(null);
        setCustomStart('');
        setCustomEnd('');
        setCustomError('');
        setShowCustom(false);
        setActiveTab('today');
    };

    /* ── today's max for date inputs ── */
    const todayStr = toKey(new Date());

    /* ── active stats object ── */
    const activeStats = activeTab === 'custom' && customStats
        ? customStats
        : presetStats[activeTab] ?? presetStats.today;

    const quickActions = [
        {
            to: '/staff/products',
            icon: <FaBox />,
            label: 'View Products',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'hover:border-blue-500',
        },
        {
            to: '/staff/cart',
            icon: <FaShoppingCart />,
            label: 'Make a Sale',
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-600 dark:text-green-400',
            border: 'hover:border-green-500',
        },
        {
            to: '/staff/sales-history',
            icon: <FaHistory />,
            label: 'Sales History',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            text: 'text-purple-600 dark:text-purple-400',
            border: 'hover:border-purple-500',
        },
    ];

    return (
        <StaffDashboardLayout>
            <div className="space-y-6">

                {/* ── Welcome Banner ── */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600
                                rounded-2xl p-6 text-white shadow-lg">
                    <h1 className="text-2xl font-bold mb-1">
                        Welcome back{staffName ? `, ${staffName}` : ''}! 👋
                    </h1>
                    <p className="text-blue-100 text-sm">
                        Here's a snapshot of your sales performance.
                    </p>
                </div>

                {/* ── Stats Card ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <FaSpinner className="animate-spin text-3xl text-blue-500" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm
                                    border border-gray-100 dark:border-gray-700 overflow-hidden">

                        {/* Tab bar */}
                        <div className="flex border-b border-gray-100 dark:border-gray-700">
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`flex-1 py-3 text-xs font-semibold transition
                                        ${activeTab === t.key
                                            ? `${t.activeBg} ${t.activeText}`
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}

                            {/* Custom range tab — only visible once applied */}
                            {customApplied && (
                                <button
                                    onClick={() => setActiveTab('custom')}
                                    className={`flex-1 py-3 text-xs font-semibold transition relative
                                        ${activeTab === 'custom'
                                            ? 'bg-orange-500 text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    Custom
                                </button>
                            )}

                            {/* Filter toggle button */}
                            <button
                                onClick={() => setShowCustom(v => !v)}
                                className={`px-4 py-3 text-xs font-semibold transition border-l
                                            border-gray-100 dark:border-gray-700
                                            ${showCustom
                                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                title="Custom date range"
                            >
                                <FaFilter />
                            </button>
                        </div>

                        {/* Custom date range panel */}
                        {showCustom && (
                            <div className="border-b border-gray-100 dark:border-gray-700
                                            bg-orange-50 dark:bg-orange-900/10 px-4 py-4">
                                <div className="flex flex-wrap flex-row gap-3 items-center sm:items-end">

                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold
                                                          text-gray-600 dark:text-gray-400 mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            max={customEnd || todayStr}
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border
                                                       border-gray-300 dark:border-gray-600
                                                       bg-white dark:bg-gray-700
                                                       text-gray-900 dark:text-white
                                                       focus:ring-2 focus:ring-orange-400 outline-none"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold
                                                          text-gray-600 dark:text-gray-400 mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            min={customStart}
                                            max={todayStr}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded-lg border
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
                                            className="px-4 py-2 text-xs font-bold rounded-lg
                                                       bg-orange-500 hover:bg-orange-600
                                                       text-white transition disabled:opacity-60
                                                       flex items-center gap-1.5"
                                        >
                                            {customLoading
                                                ? <FaSpinner className="animate-spin" />
                                                : 'Apply'
                                            }
                                        </button>

                                        {customApplied && (
                                            <button
                                                onClick={clearCustom}
                                                className="px-4 py-2 text-xs font-bold rounded-lg
                                                           bg-gray-200 dark:bg-gray-600
                                                           text-gray-700 dark:text-gray-200
                                                           hover:bg-gray-300 dark:hover:bg-gray-500
                                                           transition flex items-center gap-1.5"
                                            >
                                                <FaTimes /> Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Error / hint */}
                                {customError ? (
                                    <p className="mt-2 text-xs font-medium text-red-500">
                                        {customError}
                                    </p>
                                ) : (
                                    <p className="mt-2 text-xs text-gray-400">
                                        Maximum range: 90 days
                                    </p>
                                )}

                                {/* Show applied range label */}
                                {customApplied && customStart && customEnd && (
                                    <p className="mt-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                        Showing: {new Date(customStart).toLocaleDateString()} –{' '}
                                        {new Date(customEnd).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Stats body */}
                        <StatsBody
                            activeTab={activeTab}
                            stats={activeStats}
                            currency={currency}
                            customStart={customStart}
                            customEnd={customEnd}
                        />
                    </div>
                )}

                {/* ── Quick Actions ── */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        {quickActions.map((action) => (
                            <Link
                                key={action.to}
                                to={action.to}
                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm
                                            border-2 border-transparent ${action.border}
                                            p-4 flex flex-col items-center gap-3
                                            transition hover:shadow-md group`}
                            >
                                <div className={`w-12 h-12 rounded-2xl ${action.bg} ${action.text}
                                                 flex items-center justify-center text-xl
                                                 group-hover:scale-110 transition`}>
                                    {action.icon}
                                </div>
                                <span className="text-xs font-semibold text-gray-700
                                                 dark:text-gray-300 text-center leading-tight">
                                    {action.label}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── Recent Sales ── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Recent Sales
                        </h2>
                        <Link
                            to="/staff/sales-history"
                            className="text-sm text-blue-600 dark:text-blue-400
                                       hover:underline font-medium"
                        >
                            View All →
                        </Link>
                    </div>

                    {recentSales.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm
                                        border border-gray-100 dark:border-gray-700
                                        p-10 text-center">
                            <FaHistory className="text-3xl text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                No sales yet today
                            </p>
                            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
                                Head to Products to start selling
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm
                                        border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {recentSales.map((sale) => (
                                    <div
                                        key={sale.id}
                                        className="flex items-center justify-between
                                                   px-4 py-3 hover:bg-gray-50
                                                   dark:hover:bg-gray-700/50 transition"
                                    >
                                        <div className="min-w-0 flex-1 pr-3">
                                            <p className="text-sm font-medium text-gray-800
                                                          dark:text-white truncate">
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
                                        <span className="text-sm font-bold shrink-0
                                                         text-green-600 dark:text-green-400">
                                            {currency.symbol}{(sale.totalAmount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </StaffDashboardLayout>
    );
}

/* ══════════════════════════════════════════════════════════════
   TABS CONFIG
══════════════════════════════════════════════════════════════ */
const TABS = [
    {
        key:        'today',
        label:      'Today',
        icon:       FaCalendarDay,
        activeBg:   'bg-blue-600',
        activeText: 'text-white',
        color:      'text-blue-600 dark:text-blue-400',
        iconBg:     'bg-blue-100 dark:bg-blue-900/30',
    },
    {
        key:        'week',
        label:      'This Week',
        icon:       FaCalendarWeek,
        activeBg:   'bg-green-600',
        activeText: 'text-white',
        color:      'text-green-600 dark:text-green-400',
        iconBg:     'bg-green-100 dark:bg-green-900/30',
    },
    {
        key:        'month',
        label:      'This Month',
        icon:       FaCalendar,
        activeBg:   'bg-purple-600',
        activeText: 'text-white',
        color:      'text-purple-600 dark:text-purple-400',
        iconBg:     'bg-purple-100 dark:bg-purple-900/30',
    },
];

/* ══════════════════════════════════════════════════════════════
   STATS BODY
══════════════════════════════════════════════════════════════ */
function StatsBody({ activeTab, stats, currency, customStart, customEnd }) {
    const isCustom = activeTab === 'custom';
    const tab      = TABS.find(t => t.key === activeTab);

    const color  = isCustom ? 'text-orange-600 dark:text-orange-400' : tab?.color;
    const iconBg = isCustom ? 'bg-orange-100 dark:bg-orange-900/30'  : tab?.iconBg;
    const Icon   = isCustom ? FaChartLine : tab?.icon ?? FaChartLine;

    const label = isCustom
        ? (customStart && customEnd
            ? `${new Date(customStart).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(customEnd).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
            : 'Custom Range')
        : tab?.label;

    return (
        <div className="p-6 flex items-center justify-between">
            <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                    {label}
                </p>
                <p className="text-4xl font-black text-gray-900 dark:text-white">
                    {stats.salesCount ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sales</p>

                <p className={`text-xl font-bold ${color} mt-3`}>
                    {currency.symbol}{(stats.revenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Revenue</p>

            </div>

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${iconBg}`}>
                <Icon className={`text-2xl ${color}`} />
            </div>
        </div>
    );
}