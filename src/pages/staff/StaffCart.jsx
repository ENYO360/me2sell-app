import React, { useState } from "react";
import StaffDashboardLayout from "./StaffDashboardLayout";
import { useProducts } from "../../context/ProductContext";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTrash,
  FaMinus,
  FaPlus,
  FaShoppingCart,
  FaMoneyBillWave,
  FaReceipt,
  FaBoxOpen,
} from "react-icons/fa";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { MdOutlineStorefront } from "react-icons/md";

export default function StaffCart() {
  const {
    cartItems,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    checkoutCart,
    staffName,
    addToCart,
    confirming,
    ownerLoading,
  } = useCart();

  const { currency } = useCurrency();

  const [editedPrices, setEditedPrices] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = Number(editedPrices[item.id] ?? item.sellingPrice) || 0;
    return sum + price * item.quantity;
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const updatePrice = (id, value) => {
    setEditedPrices((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirmCheckout = () => {
    const numericPrices = {};
    Object.keys(editedPrices).forEach((id) => {
      numericPrices[id] = Number(editedPrices[id]) || 0;
    });
    checkoutCart(numericPrices);
    setCheckoutOpen(false);
  };

  // ── Main cart view ───────────────────────────────────────────────────────
  return (
    <StaffDashboardLayout>
      <div className="max-w-2xl mx-auto mb-16 px-1">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/15 flex items-center justify-center">
              <HiOutlineShoppingBag className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                My Cart
              </h1>
              {cartItems.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {cartItems.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCheckoutOpen(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700
                         text-white text-sm font-semibold px-5 py-2.5 rounded-xl
                         shadow-lg shadow-green-600/20 transition-colors"
            >
              <FaReceipt size={13} />
              <span>
                Checkout · {currency.symbol}{totalAmount.toLocaleString()}
              </span>
            </motion.button>
          )}
        </div>

        {/* ── Empty State ── */}
        {cartItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <FaBoxOpen className="text-gray-400 dark:text-gray-600 text-3xl" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Your cart is empty
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              Add products to get started
            </p>
          </motion.div>
        )}

        {/* ── Cart Items ── */}
        <div className="space-y-3">
          <AnimatePresence>
            {cartItems.map((item, index) => {
              const displayPrice = editedPrices[item.id] ?? String(item.sellingPrice);
              const lineTotal = (Number(displayPrice) || 0) * item.quantity;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.97 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="bg-white dark:bg-gray-800/70 border border-gray-100
                             dark:border-gray-700/60 rounded-2xl p-4 shadow-sm"
                >
                  {/* Top row — name + delete */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Cost: {currency.symbol}{Number(item.costPrice || 0).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl
                                 text-gray-400 hover:text-red-500
                                 hover:bg-red-50 dark:hover:bg-red-900/20
                                 transition-all shrink-0"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>

                  {/* Bottom row — qty + price + total */}
                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/60
                                    rounded-xl px-1 py-1">
                      <button
                        onClick={() => decreaseQuantity(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                   text-gray-600 dark:text-gray-300
                                   hover:bg-white dark:hover:bg-gray-600
                                   transition-all text-xs"
                      >
                        <FaMinus size={10} />
                      </button>
                      <span className="text-sm font-bold text-gray-800 dark:text-white w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increaseQuantity(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg
                                   text-gray-600 dark:text-gray-300
                                   hover:bg-white dark:hover:bg-gray-600
                                   transition-all"
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>

                    {/* Price input */}
                    <div className="flex flex-col">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2
                                         text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          value={displayPrice}
                          onChange={(e) => updatePrice(item.id, e.target.value)}
                          className="w-28 pl-6 pr-2 py-1.5 text-sm font-semibold
                                     border border-gray-200 dark:border-gray-600
                                     bg-white dark:bg-gray-700
                                     text-gray-800 dark:text-white
                                     rounded-xl focus:outline-none focus:ring-2
                                     focus:ring-blue-500/30 transition"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 pl-1">
                        tap to edit price
                      </span>
                    </div>

                    {/* Line total */}
                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {currency.symbol}{lineTotal.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400">subtotal</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Order Summary strip ── */}
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gray-50 dark:bg-gray-800/50 border border-gray-100
                       dark:border-gray-700/50 rounded-2xl p-5 space-y-2"
          >
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Items</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Products</span>
              <span>{cartItems.length}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2
                            flex justify-between font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-green-600 dark:text-green-400">
                {currency.symbol}{totalAmount.toLocaleString()}
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setCheckoutOpen(true)}
              className="w-full mt-3 py-3 rounded-xl bg-green-600 hover:bg-green-700
                         text-white font-semibold text-sm flex items-center justify-center gap-2
                         shadow-lg shadow-green-600/20 transition-colors"
            >
              <FaReceipt size={14} />
              Proceed to Checkout
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ── Checkout Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCheckoutOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm
                       flex items-end sm:items-center justify-center
                       p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 w-full max-w-md
                         rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <MdOutlineStorefront className="text-white text-xl" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">
                      Confirm Sale
                    </h2>
                    <p className="text-green-100 text-xs">
                      Review your order before confirming
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Order items */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mb-5">
                  {cartItems.map((item) => {
                    const price = Number(editedPrices[item.id] ?? item.sellingPrice) || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2
                                   border-b border-gray-100 dark:border-gray-800
                                   last:border-0"
                      >
                        <div className="flex-1 pr-3">
                          <p className="text-sm font-medium text-gray-800 dark:text-white line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {currency.symbol}{price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {currency.symbol}{(price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3
                                flex items-center justify-between mb-6">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Total Amount
                  </span>
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {currency.symbol}{totalAmount.toLocaleString()}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800
                               text-gray-700 dark:text-gray-300 font-semibold text-sm
                               hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
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
                    disabled={confirming}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm
                                text-white flex items-center justify-center gap-2
                                transition-colors
                                ${confirming
                                  ? "bg-green-400 cursor-not-allowed"
                                  : "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                                }`}
                  >
                    {confirming ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent
                                        rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaReceipt size={13} />
                        Confirm Sale
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaffDashboardLayout>
  );
}

