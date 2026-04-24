// SaleModal.jsx
import { useState, useEffect, useRef } from "react";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useCurrency } from "../../context/CurrencyContext";

export default function SaleModal() {
  const { selectedProduct, isSaleModalOpen, cancelSale, confirmSale, processing } =
    useDirectSale();

  const [price, setPrice] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const priceInputRef = useRef(null);
  const { currency } = useCurrency();

  // Animate in
  useEffect(() => {
    if (isSaleModalOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isSaleModalOpen]);

  useEffect(() => {
    if (selectedProduct) setPrice(selectedProduct.sellingPrice);
  }, [selectedProduct]);

  useEffect(() => {
    if (isEditing && priceInputRef.current) priceInputRef.current.focus();
  }, [isEditing]);

  if (!isSaleModalOpen || !selectedProduct) return null;

  const originalPrice = selectedProduct.sellingPrice;
  const currentPrice  = Number(price) || 0;
  const discount      = originalPrice > 0
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;
  const isDiscounted  = discount > 0;
  const isMarkedUp    = discount < 0;

  const handleConfirm = () => confirmSale(currentPrice);
  const commitEdit    = () => { if (price === "" || isNaN(price)) setPrice("0"); setIsEditing(false); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background: visible ? "rgba(3,22,90,0.45)" : "rgba(3,22,90,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease",
      }}
      onClick={cancelSale}
    >
      {/* Modal sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-700 sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl"
        style={{
          transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        }}
      >
        {/* ── Accent header band ── */}
        <div className="relative h-2 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-green-500" />

        {/* ── Drag handle (mobile) ── */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-7 pt-5 pb-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500 mb-1">
                Direct Sale
              </p>
              <h2 className="text-2xl font-bold text-[#03165A] dark:text-[#163bbf] leading-tight">
                {selectedProduct.name}
              </h2>
            </div>

            {/* Close button */}
            <button
              onClick={cancelSale}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 transition -mt-1"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── Price block ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Selling Price
              </label>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] font-semibold text-[#03165A] dark:text-[#163bbf] hover:text-[#FA212F] transition flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {/* Display mode */}
            {!isEditing ? (
              <div
                onClick={() => setIsEditing(true)}
                className="group relative flex items-center cursor-pointer"
              >
                <div className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-500 group-hover:border-[#03165A]/20 group-hover:bg-[#03165A]/[0.02] transition">
                  <span className="text-lg font-bold text-gray-400 dark:text-gray-300">{currency.symbol}</span>
                  <span className="text-4xl font-black text-[#03165A] dark:text-[#163bbf] tracking-tight">
                    {Number(price).toLocaleString()}
                  </span>
                </div>

                {/* Discount / markup badge */}
                {isDiscounted && (
                  <span className="absolute right-4 inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M5 1l1.5 3h3l-2.5 2 1 3L5 7.5 3 9l1-3L1.5 4h3z"/>
                    </svg>
                    {discount}% off
                  </span>
                )}
                {isMarkedUp && (
                  <span className="absolute right-4 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    +{Math.abs(discount)}%
                  </span>
                )}
              </div>
            ) : (
              /* Edit mode */
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-300 dark:text-gray-500 pointer-events-none select-none">
                  {currency.symbol}
                </span>
                <input
                  type="number"
                  ref={priceInputRef}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setPrice(originalPrice); setIsEditing(false); } }}
                  className="w-full pl-10 pr-5 py-4 text-4xl font-black text-[#03165A] tracking-tight rounded-2xl border-2 border-[#03165A]/30 bg-white focus:border-[#03165A] focus:ring-4 focus:ring-[#03165A]/10 outline-none transition"
                />
              </div>
            )}

            {/* Original price hint */}
            {Number(price) !== Number(originalPrice) && (
              <p className="text-xs text-gray-400 pl-1">
                Original: {currency.symbol}{Number(originalPrice).toLocaleString()}
                {isDiscounted && <span className="text-green-600 ml-1">— selling below cost</span>}
                {isMarkedUp   && <span className="text-amber-600 ml-1">— marked up</span>}
              </p>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              onClick={cancelSale}
              className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
            >
              Cancel
            </button>

            <button
              disabled={processing || currentPrice <= 0}
              onClick={handleConfirm}
              className="flex-[2] relative overflow-hidden py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-[#051d70] hover:to-[#2247b0] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#03165A]/25"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Confirm Sale
                </span>
              )}

              {/* Shimmer on hover */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                }}
              />
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}