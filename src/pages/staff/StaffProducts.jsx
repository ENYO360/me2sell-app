// src/pages/staff/StaffProducts.jsx
import React, { useState, useMemo } from 'react';
import StaffDashboardLayout from './StaffDashboardLayout';
import { useProducts } from '../../context/ProductContext';
import { useCart } from '../../context/CartContext';
import { useDirectSale } from '../../context/DirectSaleContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useCurrency } from '../../context/CurrencyContext';
import ProductImageCarousel from '../dashboard/ProductImageCarousel';
import SaleModal from '../dashboard/SaleModal';
import {
    FaBox,
    FaSearch,
    FaShoppingCart,
    FaMoneyBillWave,
    FaExclamationTriangle,
    FaSpinner,
} from 'react-icons/fa';

export default function StaffProducts() {
    const { products, loading, isLowStock, getLowStockProducts } = useProducts();
    const { addToCart, ownerLoading, adding } = useCart();
    const { startSale } = useDirectSale();           // ✅ use context
    const { currency } = useCurrency();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Unique departments and categories from accessible products
    const departments = useMemo(() => {
        const depts = new Set();
        products.forEach(p => { if (p.department) depts.add(p.department); });
        return Array.from(depts).sort();
    }, [products]);

    const categories = useMemo(() => {
        const cats = new Set();
        products.forEach(p => { if (p.category) cats.add(p.category); });
        return Array.from(cats).sort();
    }, [products]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch =
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDepartment =
                selectedDepartment === 'all' || product.department === selectedDepartment;

            const matchesCategory =
                selectedCategory === 'all' || product.category === selectedCategory;

            return matchesSearch && matchesDepartment && matchesCategory;
        });
    }, [products, searchTerm, selectedDepartment, selectedCategory]);

    const lowStockProducts = getLowStockProducts();

    // ✅ Add to cart — uses CartContext (ownerLoading guard included)
    const handleAddToCart = (product) => {
        if (product.quantity <= 0) return;
        addToCart(product);
    };

    // ✅ Direct sell — opens SaleModal via DirectSaleContext
    const handleDirectSell = (product) => {
        if (product.quantity <= 0) return;
        startSale(product);
    };

    return (
        <StaffDashboardLayout>
            <div className="space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Products
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Browse and sell products you have access to
                        </p>
                    </div>

                    {lowStockProducts.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                            <FaExclamationTriangle className="text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                                {lowStockProducts.length} low stock
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Stats ── */}
                <div className="hidden md:grid grid-cols-3 md:grid-cols-3 gap-4">
                    <StatCard
                        label="Accessible Products"
                        value={products.length}
                        color="border-blue-500"
                        icon={<FaBox className="text-4xl text-blue-500" />}
                    />
                    <StatCard
                        label="Low Stock Items"
                        value={lowStockProducts.length}
                        color="border-orange-500"
                        icon={<FaExclamationTriangle className="text-4xl text-orange-500" />}
                    />
                    <StatCard
                        label="Out of Stock"
                        value={products.filter(p => p.quantity === 0).length}
                        color="border-red-500"
                        icon={<FaBox className="text-4xl text-red-500" />}
                    />
                </div>

                {/* ── Filters ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2 relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search products..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600
                                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                           rounded-lg focus:ring-2 focus:ring-blue-500
                                           focus:border-blue-500 outline-none transition"
                            />
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        {/* Department */}
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600
                                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                       rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>

                        {/* Category */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600
                                       bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                       rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Products Grid ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <FaSpinner className="animate-spin text-4xl text-blue-600" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                        <FaBox className="text-5xl text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Products Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {searchTerm || selectedDepartment !== 'all' || selectedCategory !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No products available yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                currency={currency}
                                isLowStock={isLowStock}
                                ownerLoading={ownerLoading}
                                onAddToCart={handleAddToCart}
                                onDirectSell={handleDirectSell}
                                adding={adding}
                            />
                        ))}
                    </div>
                )}

                {/* Results count */}
                {!loading && filteredProducts.length > 0 && (
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Showing {filteredProducts.length} of {products.length} products
                    </p>
                )}
            </div>

            {/* ✅ SaleModal driven by DirectSaleContext — no local modal needed */}
            <SaleModal />
        </StaffDashboardLayout>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-6 border-l-4 ${color}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
                </div>
                {icon}
            </div>
        </div>
    );
}

// ── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, currency, isLowStock, ownerLoading, onAddToCart, onDirectSell, adding }) {
    const isOut = product.quantity === 0;
    const lowStock = isLowStock(product.quantity);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg
                         transition overflow-hidden
                         ${lowStock ? 'border-2 border-orange-400' : ''}`}>

            {/* Image */}
            <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                {product.image ? (
                    <ProductImageCarousel
                        images={[product.image, product.image2].filter(Boolean)}
                        imgHeight={48}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FaBox className="text-5xl text-gray-400" />
                    </div>
                )}

                {/* Stock badge */}
                <div className="absolute top-2 right-2">
                    {isOut ? (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                            Out of Stock
                        </span>
                    ) : lowStock ? (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                            Low Stock
                        </span>
                    ) : (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                            In Stock
                        </span>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate sm:mb-1">
                    {product.name}
                </h3>

                <div className="flex items-center justify-between text-sm
                                text-gray-600 dark:text-gray-400 sm:mb-2">
                    <span>Stock: {product.quantity}</span>
                    {product.sku && (
                        <span className="text-xs">SKU: {product.sku}</span>
                    )}
                </div>

                <p className="sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                    {currency.symbol}{Number(product.sellingPrice).toLocaleString()}
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-between gap-2">
                    <button
                        onClick={() => onAddToCart(product)}
                        disabled={isOut || ownerLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm dark:text-gray-300 dark:bg-gray-700 shadow-[#03165A]/20"
                    >
                        {adding === product.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><FaShoppingCart className="text-[10px]" /> Add</>
                        )}
                    </button>

                    <button
                        onClick={() => onDirectSell(product)}
                        disabled={isOut || ownerLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm dark:text-gray-300 dark:bg-gray-700 shadow-[#03165A]/20"
                    >
                        <FaMoneyBillWave className="text-xs" />
                        Sell
                    </button>
                </div>
            </div>
        </div>
    );
}