/* ===============================
   RECEIPT COMPONENT
   Separate component so ref works
================================*/
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


/* ===============================
   RECEIPT MODAL COMPONENT
================================*/
function ReceiptModal({ sale, currency, profile, logoSrc, onClose, customer }) {
  const receiptRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Share as Image — uses Web Share API if available, falls back to download
  const handleShareImage = async () => {
    if (!receiptRef.current) return;
    setSharing(true);

    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        // Ensures full height is captured
        style: {
          transform: "none",
          overflow: "visible",
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `receipt-${sale.id}.png`, {
        type: "image/png",
      });

      // Try Web Share API first (works on mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt - ${profile?.business?.businessName || "Sales Receipt"}`,
          text: `Sales receipt for ${sale.totalAmount ? `${currency.symbol}${sale.totalAmount.toLocaleString()}` : ""}`,
          files: [file],
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } else {
        // Fallback: download the image
        const link = document.createElement("a");
        link.download = `receipt-${sale.id?.slice(-8)}.png`;
        link.href = dataUrl;
        link.click();
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
        alert("Could not share receipt. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  // Print as PDF — renders receipt in a clean print window
  const handlePrintPDF = async () => {
    if (!receiptRef.current) return;
    setPrinting(true);

    try {
      const dataUrl = await htmlToImage.toPng(receiptRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        style: {
          transform: "none",
          overflow: "visible",
        },
      });

      const printWindow = window.open("", "_blank", "width=400,height=700");
      if (!printWindow) {
        alert("Please allow popups to print the receipt.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${sale.id?.slice(-10).toUpperCase()}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 100vh;
                background: #f5f5f5;
                padding: 20px;
              }
              img.receipt-img {
                max-width: 320px;
                width: 100%;
                display: block;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                  display: block;
                }
                img.receipt-img {
                  max-width: 100%;
                  box-shadow: none;
                }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div>
              <img class="receipt-img" src="${dataUrl}" alt="Receipt" />
              <div class="no-print" style="text-align:center; margin-top: 16px;">
                <button
                  onclick="window.print()"
                  style="
                    padding: 10px 28px;
                    background: #1d4ed8;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                  "
                >
                  🖨️ Print / Save as PDF
                </button>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      // Auto-trigger print after image loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } catch (err) {
      console.error("Print failed:", err);
      alert("Could not prepare receipt for printing.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Receipt Preview</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                #{sale.id?.slice(-10).toUpperCase()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <FaTimes className="text-gray-500" />
            </button>
          </div>

          {/* Receipt Preview — scrollable */}
          <div className="overflow-y-auto max-h-[55vh] flex justify-center bg-gray-50 py-4 px-4">
            <div className="shadow-md rounded">
              <Receipt
                ref={receiptRef}
                sale={sale}
                currency={currency}
                profile={profile}
                logoSrc={logoSrc}
                customer={customer}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            {/* Share as Image */}
            <button
              onClick={handleShareImage}
              disabled={sharing}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition ${shareSuccess
                ? "bg-green-500 text-white"
                : sharing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200"
                }`}
            >
              {sharing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Generating Image...
                </>
              ) : shareSuccess ? (
                <>✅ Image Saved!</>
              ) : (
                <>
                  <FaShareAlt />
                  Share as Image
                </>
              )}
            </button>

            {/* Print PDF */}
            <button
              onClick={handlePrintPDF}
              disabled={printing}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition ${printing
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                }`}
            >
              {printing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Preparing PDF...
                </>
              ) : (
                <>
                  <FaPrint />
                  Print / Save as PDF
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}