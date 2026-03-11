// src/pages/staff/StaffDashboard.jsx
import React, { useState, useEffect } from 'react';
import StaffDashboardLayout from './StaffDashboardLayout';
import { auth, db } from '../../firebase/config';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc,
    Timestamp,
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
} from 'react-icons/fa';

export default function StaffDashboard() {
    const { currency } = useCurrency();
    const { permissions } = usePermissions();

    const [staffName, setStaffName] = useState('');
    const [stats, setStats] = useState({
        todaySales: 0,    todayRevenue: 0,
        weeklySales: 0,   weeklyRevenue: 0,
        monthlySales: 0,  monthlyRevenue: 0,
    });
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { setLoading(false); return; }

            try {
                /* ── 1. Resolve ownerId ── */
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (!userSnap.exists()) { setLoading(false); return; }

                const businessId = userSnap.data().businessId;
                if (!businessId) { setLoading(false); return; }

                /* ── 2. Get staff display name ── */
                const staffSnap = await getDoc(doc(db, 'staff', user.uid));
                if (staffSnap.exists()) {
                    setStaffName(staffSnap.data().fullName || '');
                }

                /* ── 3. Date boundaries ── */
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const startOfWeek  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                const endOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

                /* ── 4. ONE query for the whole month ──────────────────────────
                   Today and week are subsets of the month so we fetch once
                   and filter all three periods in memory — zero extra reads.

                   ✅ Cache layer: skip Firestore entirely for 5 min on revisit
                ────────────────────────────────────────────────────────────────── */
                const CACHE_KEY  = `staff_dash_${user.uid}`;
                const CACHE_TTL  = 5 * 60 * 1000; // 5 minutes in ms
                let monthlySales = [];
                let fromCache    = false;

                try {
                    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
                    if (cached && Date.now() - cached.ts < CACHE_TTL) {
                        monthlySales = cached.data;
                        fromCache    = true;
                    }
                } catch (_) { /* ignore parse errors */ }

                if (!fromCache) {
                    const monthSnap = await getDocs(query(
                        collection(db, 'sales', businessId, 'userSales'),
                        where('soldBy',    '==', user.uid),
                        where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
                        where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
                        orderBy('createdAt', 'desc'),
                    ));

                    // Store _ts (epoch seconds) so data survives JSON serialization
                    monthlySales = monthSnap.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        _ts: d.data().createdAt?.seconds || 0,
                    }));

                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            ts:   Date.now(),
                            data: monthlySales,
                        }));
                    } catch (_) { /* storage full — skip silently */ }
                }

                /* ── 5. Filter in memory (zero extra Firestore reads) ── */
                const todayTs = startOfToday.getTime() / 1000;
                const weekTs  = startOfWeek.getTime()  / 1000;

                const todayArr  = monthlySales.filter(s => s._ts >= todayTs);
                const weekArr   = monthlySales.filter(s => s._ts >= weekTs);
                const sumRev    = (arr) => arr.reduce((a, s) => a + (s.totalAmount || 0), 0);

                setStats({
                    todaySales:     todayArr.length,
                    todayRevenue:   sumRev(todayArr),
                    weeklySales:    weekArr.length,
                    weeklyRevenue:  sumRev(weekArr),
                    monthlySales:   monthlySales.length,
                    monthlyRevenue: sumRev(monthlySales),
                });

                /* ── 6. Recent 5 — today first, fall back to full month ── */
                const recentArr = (todayArr.length > 0 ? todayArr : monthlySales).slice(0, 5);
                setRecentSales(recentArr.map(s => ({
                    ...s,
                    createdAt: s.createdAt?.toDate?.()
                        ?? (s._ts ? new Date(s._ts * 1000) : null),
                })));

            } catch (err) {
                console.error('StaffDashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

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

                {/* ── Stats — single tabbed card ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <FaSpinner className="animate-spin text-3xl text-blue-500" />
                    </div>
                ) : (
                    <StatsCard stats={stats} currency={currency} />
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

                {/* ── Permissions Badge ── */}
                {permissions && Object.values(permissions).some(Boolean) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl
                                    border border-blue-100 dark:border-blue-800 p-5">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">
                            Your Permissions
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {permissions?.canEditStock && (
                                <span className="px-3 py-1 text-xs font-medium rounded-full
                                                 bg-green-100 dark:bg-green-900/40
                                                 text-green-700 dark:text-green-300">
                                    ✓ Edit Stock
                                </span>
                            )}
                            {permissions?.canDeleteProducts && (
                                <span className="px-3 py-1 text-xs font-medium rounded-full
                                                 bg-red-100 dark:bg-red-900/40
                                                 text-red-700 dark:text-red-300">
                                    ✓ Delete Products
                                </span>
                            )}
                            {permissions?.canViewAllSales && (
                                <span className="px-3 py-1 text-xs font-medium rounded-full
                                                 bg-purple-100 dark:bg-purple-900/40
                                                 text-purple-700 dark:text-purple-300">
                                    ✓ View All Sales
                                </span>
                            )}
                            {permissions?.canAccessReports && (
                                <span className="px-3 py-1 text-xs font-medium rounded-full
                                                 bg-blue-100 dark:bg-blue-900/40
                                                 text-blue-700 dark:text-blue-300">
                                    ✓ Access Reports
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </StaffDashboardLayout>
    );
}

/* ── Single tabbed stats card ───────────────────────────────────── */
const TABS = [
    {
        key: 'today',
        label: 'Today',
        icon: FaCalendarDay,
        salesKey:   'todaySales',
        revenueKey: 'todayRevenue',
        color: 'text-blue-600 dark:text-blue-400',
        activeBg: 'bg-blue-600',
        activeText: 'text-white',
    },
    {
        key: 'week',
        label: 'This Week',
        icon: FaCalendarWeek,
        salesKey:   'weeklySales',
        revenueKey: 'weeklyRevenue',
        color: 'text-green-600 dark:text-green-400',
        activeBg: 'bg-green-600',
        activeText: 'text-white',
    },
    {
        key: 'month',
        label: 'This Month',
        icon: FaCalendar,
        salesKey:   'monthlySales',
        revenueKey: 'monthlyRevenue',
        color: 'text-purple-600 dark:text-purple-400',
        activeBg: 'bg-purple-600',
        activeText: 'text-white',
    },
];

function StatsCard({ stats, currency }) {
    const [activeTab, setActiveTab] = useState('today');
    const tab = TABS.find(t => t.key === activeTab);
    const Icon = tab.icon;

    return (
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
            </div>

            {/* Body */}
            <div className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                        {tab.label}
                    </p>
                    <p className="text-4xl font-black text-gray-900 dark:text-white">
                        {stats[tab.salesKey]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Sales
                    </p>
                    <p className={`text-xl font-bold ${tab.color} mt-3`}>
                        {currency.symbol}{(stats[tab.revenueKey] || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Revenue</p>
                </div>

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                                 ${activeTab === 'today'  ? 'bg-blue-100   dark:bg-blue-900/30'   : ''}
                                 ${activeTab === 'week'   ? 'bg-green-100  dark:bg-green-900/30'  : ''}
                                 ${activeTab === 'month'  ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}>
                    <Icon className={`text-2xl ${tab.color}`} />
                </div>
            </div>
        </div>
    );
}