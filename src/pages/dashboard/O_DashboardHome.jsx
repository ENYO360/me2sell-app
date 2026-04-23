// src/components/dashboard/DashboardHome.jsx
import React, { useEffect, useState } from "react";
import { useSearch } from "../../context/SearchContext";
import { useCart } from "../../context/CartContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";
import { FaShoppingCart, FaCashRegister, FaBoxOpen } from "react-icons/fa";
import ProductImageCarousel from "./ProductImageCarousel";
import DashboardLayout from "./O_DashboardLayout";
import SaleModal from "./SaleModal";
import { motion } from "framer-motion";

export default function DashboardHome() {
  const { products, lowStockThreshold, loading } = useProducts();
  const { setScope, results } = useSearch();
  const { addToCart, adding } = useCart();
  const { startSale } = useDirectSale();
  const { currency } = useCurrency();

  // Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.quantity > 0 && p.quantity <= lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;
  const inStockCount = totalProducts - outOfStockCount;

  useEffect(() => { setScope("all-products"); }, []);

  const listToRender = (results.length > 0 ? results : products)
    .slice()
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const isSearching = results.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#03165A] dark:text-[#163bbf]">
              {isSearching ? "Search Results" : "Available Products"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isSearching
                ? `${listToRender.length} result${listToRender.length !== 1 ? "s" : ""} found`
                : `${totalProducts} product${totalProducts !== 1 ? "s" : ""} total`}
            </p>
          </div>
        </div>

        {/* ── STATS ROW (only on non-search) ── */}
        {!isSearching && !loading && totalProducts > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "In Stock", value: inStockCount, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
              { label: "Low Stock", value: lowStockCount, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
              { label: "Out of Stock", value: outOfStockCount, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className={`${bg} border ${border} dark:bg-gray-700 rounded-2xl px-4 py-3 text-center`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className={`text-2xl font-black mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── LOADING SKELETONS ── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-100 dark:bg-gray-700 w-full" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-gray-100 dark:bg-gray-600 rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded-lg w-1/2" />
                  <div className="h-8 bg-gray-100 dark:bg-gray-600 rounded-xl w-full mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/6 flex items-center justify-center">
              <FaBoxOpen className="text-[#03165A]/30 text-3xl" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-gray-500 font-semibold">No products yet</p>
              <p className="text-sm text-gray-300">Add products from the Products page to get started.</p>
            </div>
          </div>
        )}

        {/* ── EMPTY SEARCH ── */}
        {!loading && isSearching && listToRender.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <FaBoxOpen className="text-gray-300 text-2xl" />
            </div>
            <p className="text-gray-400 font-semibold text-sm">No products match your search.</p>
          </div>
        )}

        {/* ── PRODUCT GRID ── */}
        {!loading && listToRender.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {listToRender.map((product, index) => {
              const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
              const isOut = product.quantity === 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3), type: "spring", stiffness: 340, damping: 26 }}
                  className={`group relative bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden shadow-sm transition-all
                    ${isOut
                      ? "opacity-70 border-gray-100"
                      : "border-gray-100 hover:shadow-md hover:border-[#03165A]/15"
                    }`}
                >
                  {/* Accent bar */}
                  <div className={`h-1 w-full ${isOut ? "bg-red-400"
                      : isLowStock ? "bg-amber-400"
                        : "bg-gradient-to-r from-[#03165A] to-green-500"
                    }`} />

                  {/* Image */}
                  <div className="relative">
                    <ProductImageCarousel
                      images={[product.image, product.image2].filter(Boolean)}
                    />

                    {/* Stock badges — overlaid on image */}
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

                  {/* Body */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-300 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        Qty: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"
                          }`}>{product.quantity}</span>
                      </span>
                      <span className="text-sm font-black text-[#03165A] dark:text-gray-300">
                        {currency.symbol}{product.sellingPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Action buttons */}
                    {isOut ? (
                      <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">
                        Out of Stock
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToCart(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl dark:border hover:text-sm text-gray-800 dark:text-gray-400  text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20"
                        >
                          {adding === product.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          ) : (
                            <><FaShoppingCart className="text-[10px]" /> Add</>
                          )}
                        </button>

                        <button
                          onClick={() => startSale(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm dark:text-gray-400 dark:border text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20"
                        >
                          <FaCashRegister className="text-[10px]" /> Sell
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
      <SaleModal />
    </DashboardLayout>
  );
}