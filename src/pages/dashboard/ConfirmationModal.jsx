// ConfirmationModal.jsx
import React from "react";
import { useConfirmModal } from "../../context/ConfirmationContext";
import { motion, AnimatePresence } from "framer-motion";

// ── Icon variants based on message tone ──────────────────────────────────────
function ModalIcon({ type = "info" }) {
  const configs = {
    confirm: {
      bg: "bg-[#03165A]",
      ring: "ring-[#03165A]/20",
      icon: ""
    },
    danger: {
      bg: "bg-red-500",
      ring: "ring-red-500/20",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    success: {
      bg: "bg-green-500",
      ring: "ring-green-500/20",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    info: {
      bg: "bg-[#03165A]",
      ring: "ring-[#03165A]/20",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
  };

  const c = configs[type] ?? configs.info;

  return (
    <div className={`w-14 h-14 rounded-2xl ${c.bg} ring-8 ${c.ring} flex items-center justify-center flex-shrink-0 shadow-lg`}>
      {c.icon}
    </div>
  );
}

// ── Detect tone from message or buttonText ────────────────────────────────────
function detectType(modal) {
  if (modal.type) return modal.type;
  const text = ((modal.message ?? "") + (modal.buttonText ?? "")).toLowerCase();
  if (/delete|remove|cancel|danger|warning|irreversible/i.test(text)) return "danger";
  if (/success|done|save|add|complete|confirm|proceed|continue|sure/i.test(text)) return "success";
  return "info";
}

export default function ConfirmationModal() {
  const { modal, closeConfirm, confirm } = useConfirmModal();

  const type    = detectType(modal);
  const isDanger = type === "danger";

  const btnColors = {
    confirm: "bg-[#03165A] hover:bg-[#051d70] shadow-[#03165A]/30",
    danger:  "bg-red-500 hover:bg-red-600 shadow-red-500/30",
    success: "bg-green-600 hover:bg-green-700 shadow-green-600/30",
    info:    "bg-[#03165A] hover:bg-[#051d70] shadow-[#03165A]/30",
  };

  return (
    <AnimatePresence>
      {modal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeConfirm}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(3,22,90,0.45)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white dark:bg-gray-600 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* ── Top accent bar ── */}
            <div className={`h-1.5 w-full ${
              isDanger
                ? "bg-gradient-to-r from-red-400 to-red-500"
                : "bg-gradient-to-r from-[#03165A] via-[#0d6b4e] to-green-500"
            }`} />

            <div className="px-7 pt-7 pb-8 space-y-5">

              {/* ── Icon + heading ── */}
              <div className="flex items-start gap-4">
                <ModalIcon type={type} />

                <div className="pt-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#03165A] dark:text-gray-200 leading-snug">
                    {modal.title ?? ""}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-1 leading-relaxed">
                    {modal.message}
                  </p>
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* ── Actions ── */}
              <div className="flex gap-3">
                {/* Confirm */}
                <button
                  onClick={confirm}
                  className={`flex-[2] relative overflow-hidden py-3 rounded-2xl text-sm font-bold text-white
                    ${btnColors[type] ?? btnColors.info}
                    shadow-lg active:scale-95 transition-all`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {type === "danger" && (
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-1 7a1 1 0 012 0v4a1 1 0 11-2 0V9zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V9z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {type !== "danger" && (
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {modal.buttonText ?? "Confirm"}
                  </span>

                  {/* Shimmer */}
                  <span className="pointer-events-none absolute inset-0"
                    style={{ background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%)", backgroundSize: "200% 100%", animation: "shimmer 2s infinite" }}
                  />
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inject shimmer keyframe globally once
const style = document.createElement("style");
style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`;
document.head.appendChild(style);