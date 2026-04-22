import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "./O_DashboardLayout";
import SaleModal from "./SaleModal";
import ProductImageCarousel from "./ProductImageCarousel";
import { useProducts } from "../../context/ProductContext";
import { useCart } from "../../context/CartContext";
import { useSearch } from "../../context/SearchContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useCurrency } from "../../context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrash, FaMinus, FaPlus, FaShoppingCart, FaMoneyBillWave } from "react-icons/fa";

export default function Cart() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    checkoutCart,
    addToCart,
    confirming,
    adding
  } = useCart();

  const { startSale } = useDirectSale();
  const { currency } = useCurrency();
  const { products, lowStockThreshold } = useProducts();

  const [editedPrices, setEditedPrices] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { setScope, results } = useSearch();

  // Calculate total
  const totalAmount = cartItems.reduce((sum, item) => {
    const rawPrice = editedPrices[item.id] ?? item.sellingPrice;
    const price = Number(rawPrice) || 0;
    return sum + price * item.quantity;
  }, 0);

  // Handle price edit
  const updatePrice = (id, value) => {
    setEditedPrices((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const searchActive = results.length > 0;
  const displayList = searchActive ? results : products;

  if (searchActive) {
    return (
      <DashboardLayout>
        <div className="">

          <h2 className="md:text-2xl text-lg font-semibold mb-4">Search Results</h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {displayList.map((product) => {

              const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
              const isOut = product.quantity === 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-md p-1 
                              transition ${isOut ? "opacity-80" : "hover:shadow-lg"} cursor-pointer`}
                >

                  {/* 🔥 LOW STOCK WARNING */}
                  {isLowStock && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold 
                      px-3 py-1 z-20 rounded-full shadow animate-pulse"
                    >
                      Low Stock ({product.quantity})
                    </motion.div>
                  )}

                  {/* ❌ OUT OF STOCK ALERT */}
                  {isOut && (
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold 
                      px-3 py-1 z-20 rounded-full shadow"
                    >
                      Out of Stock
                    </motion.div>
                  )}

                  {/* PRODUCT IMAGE */}
                  <div className="">
                    <ProductImageCarousel
                      images={[
                        product.image,
                        product.image2
                      ].filter(Boolean)}
                    />
                  </div>

                  <h3 className="md:text-lg text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                    {product.name}
                  </h3>

                  <div className="mt-1">
                    <p className="md:text-sm text-xs mb-1">Quantity: {product.quantity}</p>
                    <p className="text-sm font-semibold">{currency.symbol}{product.sellingPrice.toLocaleString()}</p>
                  </div>

                  {/* 🔘 BUTTONS OR OUT OF STOCK ALERT */}
                  <div className="flex justify-between mt-1 flex-wrap gap-1">

                    {isOut ? (
                      // 🔴 Animated out of stock message
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.7 }}
                        className="w-full text-center bg-red-600 text-white py-2 rounded-lg font-semibold"
                      >
                        Out of Stock
                      </motion.div>
                    ) : (
                      <div className="w-full flex justify-between gap-2 ">
                        <button
                          onClick={() => addToCart(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20"
                        >
                          {adding === product.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          ) : (
                            <><FaShoppingCart className="text-[10px]" /> Add</>
                          )}
                        </button>

                        <button
                          onClick={() => startSale(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20"
                        >
                          <FaMoneyBillWave /> Sell
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <SaleModal />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 mb-16 max-w-2xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#03165A]">Cart</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {cartItems.length === 0
                ? "No items yet"
                : `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} · ${currency.symbol}${totalAmount.toLocaleString()}`}
            </p>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={() => setCheckoutOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-bold rounded-2xl shadow-lg shadow-green-600/30 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                <path d="M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
              Checkout
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold">
                {currency.symbol}{totalAmount.toLocaleString()}
              </span>
            </button>
          )}
        </div>

        {/* ── EMPTY STATE ── */}
        {cartItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-[#03165A]/6 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#03165A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-gray-500 font-semibold">Your cart is empty</p>
              <p className="text-sm text-gray-300">Add products to get started</p>
            </div>
          </div>
        )}

        {/* ── CART ITEMS ── */}
        <div className="space-y-3">
          <AnimatePresence>
            {cartItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.97 }}
                transition={{ delay: index * 0.04, type: "spring", stiffness: 340, damping: 26 }}
                className="group flex items-center gap-3 sm:gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#03165A]/15 transition-all p-4"
              >
                {/* Index badge */}
                <div className="hidden sm:flex w-8 h-8 rounded-xl bg-[#03165A]/8 items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#03165A]">{index + 1}</span>
                </div>

                {/* Name + subtotal */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Subtotal:{" "}
                    <span className="font-semibold text-green-600">
                      {currency.symbol}
                      {(
                        (Number(editedPrices[item.id] ?? item.sellingPrice) || 0) *
                        item.quantity
                      ).toLocaleString()}
                    </span>
                  </p>
                </div>

                {/* Price input */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-300 pointer-events-none select-none">
                      {currency.symbol}
                    </span>
                    <input
                      type="number"
                      value={editedPrices[item.id] ?? String(item.sellingPrice)}
                      onChange={(e) => updatePrice(item.id, e.target.value)}
                      className="w-24 pl-6 pr-2 py-2 text-sm font-bold text-[#03165A] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#03165A]/40 focus:ring-2 focus:ring-[#03165A]/10 outline-none transition"
                    />
                  </div>
                  <p className="text-[10px] text-gray-300">tap to edit</p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white text-gray-500 transition-all active:scale-90"
                  >
                    <FaMinus className="text-[9px]" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => increaseQuantity(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-blue-500 hover:text-white text-gray-500 transition-all active:scale-90"
                  >
                    <FaPlus className="text-[9px]" />
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 flex-shrink-0 sm:group-hover:opacity-100"
                >
                  <FaTrash className="text-xs" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── STICKY TOTAL FOOTER ── */}
        {cartItems.length > 0 && (
          <div className="sticky bottom-4 z-10">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 p-4 flex flex-wrap gap-2 items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</p>
                <p className="text-2xl font-black text-[#03165A]">
                  {currency.symbol}{totalAmount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setCheckoutOpen(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-green-600/30 transition-all"
              >
                Proceed to Checkout →
              </button>
            </div>
          </div>
        )}

        {/* ── CHECKOUT MODAL ── */}
        <AnimatePresence>
          {checkoutOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setCheckoutOpen(false)}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              style={{ background: "rgba(3,22,90,0.45)", backdropFilter: "blur(8px)" }}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 24 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 24 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
              >
                {/* Accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500" />

                {/* Mobile drag handle */}
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-7 pt-5 pb-8 space-y-5">

                  {/* Modal header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-600 mb-0.5">
                        Order Summary
                      </p>
                      <h2 className="text-2xl font-bold text-[#03165A]">Confirm Checkout</h2>
                    </div>
                    <button
                      onClick={() => setCheckoutOpen(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Item list */}
                  <div className="space-y-0 max-h-52 overflow-y-auto -mx-1 px-1">
                    {cartItems.map((item) => {
                      const price = Number(editedPrices[item.id] ?? item.sellingPrice) || 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              × {item.quantity} &nbsp;@&nbsp; {currency.symbol}{price.toLocaleString()}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#03165A] flex-shrink-0">
                            {currency.symbol}{(price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total pill */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-[#03165A]/[0.04] rounded-2xl border border-[#03165A]/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total</p>
                    <p className="text-2xl font-black text-[#03165A]">
                      {currency.symbol}{totalAmount.toLocaleString()}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCheckoutOpen(false)}
                      className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={async () => {
                        const numericPrices = {};
                        Object.keys(editedPrices).forEach((id) => {
                          numericPrices[id] = Number(editedPrices[id]) || 0;
                        });

                        try {
                          const success = await checkoutCart(numericPrices);

                          if (success) {
                            setCheckoutOpen(false); // close ONLY if successful
                          }
                        } catch (error) {
                          console.error("Checkout failed:", error);
                          // optionally show error message
                        }
                      }}
                      className="flex-[2] relative overflow-hidden py-3.5 rounded-2xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30 active:scale-95 transition-all"
                    >
                      {confirming ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Confirm Order
                        </span>
                      )}
                    </button>
                  </div>

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
