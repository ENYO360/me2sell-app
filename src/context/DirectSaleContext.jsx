import React, { createContext, useContext, useState, useEffect } from "react";
import {
    doc,
    collection,
    serverTimestamp,
    increment,
    runTransaction,
    getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { useNotification } from "./NotificationContext";
import { useConfirmModal } from "./ConfirmationContext";
import { useCurrency } from "./CurrencyContext";
import { stampProductVersion } from "../utils/stampProductVersion";

const DirectSaleContext = createContext();
export const useDirectSale = () => useContext(DirectSaleContext);

export const DirectSaleProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isSaleModalOpen, setSaleModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Same owner resolution pattern as CartContext
    const [user, setUser] = useState(null);
    const [ownerId, setOwnerId] = useState(null);
    const [isStaff, setIsStaff] = useState(false);
    const [staffName, setStaffName] = useState(null);
    const [ownerLoading, setOwnerLoading] = useState(true);

    const { notify } = useNotification();
    const { openConfirm } = useConfirmModal();
    const { currency } = useCurrency();

    /* ─────────────────────────────────────────
       AUTH — resolve owner, role, staffName
    ───────────────────────────────────────── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setOwnerId(null);
                setIsStaff(false);
                setStaffName(null);
                setOwnerLoading(false);
                return;
            }

            setUser(currentUser);

            const userDoc = await getDoc(doc(db, "users", currentUser.uid));

            let resolvedOwnerId = currentUser.uid;
            let resolvedIsStaff = false;
            let resolvedStaffName = null;

            if (userDoc.exists() && userDoc.data().role === "staff") {
                const businessId = userDoc.data().businessId;
                if (businessId) {
                    resolvedOwnerId = businessId;
                    resolvedIsStaff = true;

                    // ✅ Fetch staff name from staff collection
                    const staffDoc = await getDoc(doc(db, "staff", currentUser.uid));
                    if (staffDoc.exists()) {
                        resolvedStaffName =
                            staffDoc.data().fullName ||
                            currentUser.displayName ||
                            "Staff Member";
                    }
                }
            }

            setOwnerId(resolvedOwnerId);
            setIsStaff(resolvedIsStaff);
            setStaffName(resolvedStaffName);
            setOwnerLoading(false);
        });

        return () => unsub();
    }, []);

    /* ─────────────────────────────────────────
       OPEN MODAL
    ───────────────────────────────────────── */
    const startSale = (product) => {
        setSelectedProduct(product);
        setSaleModalOpen(true);
    };

    /* ─────────────────────────────────────────
       CLOSE MODAL
    ───────────────────────────────────────── */
    const cancelSale = () => {
        setSelectedProduct(null);
        setSaleModalOpen(false);
    };

    /* ─────────────────────────────────────────
       CONFIRM SALE
       - Products deducted from OWNER's productList
       - Sale recorded to OWNER's sales collection
       - soldBy      = logged-in user UID
       - soldByRole  = "admin" | "staff"
       - staffName   = only present when seller is staff
       - saleId      = document ID stamped on record
       - Stats updated under OWNER's dashboardStats
       - Stats always updated under OWNER's dashboardStats (admin)
       - Stats ALSO written to staffDashboardStats/{staffUid}/daily/{date}
         when the seller is a staff member
    ───────────────────────────────────────── */
    const confirmSale = async (editedPrice) => {
        if (!selectedProduct) return;
        if (!user) return;
        if (!ownerId) {
            openConfirm("Could not resolve business owner. Please try again.");
            return;
        }

        setProcessing(true);

        try {
            const profit = editedPrice - (selectedProduct.costPrice || 0);

            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            // ✅ Product always under owner's collection
            const productRef = doc(
                db,
                "products",
                ownerId,
                "productList",
                selectedProduct.id
            );

            // ✅ Marketplace ref
            const marketplaceRef = doc(db, "marketplaceProducts", selectedProduct.id);

            // ✅ Stats under owner's dashboardStats
            const adminDailyRef = doc(db, "dashboardStats", ownerId, "daily", todayKey);

             //   Staff stats — only written when seller is a staff member
            //    Path: staffDashboardStats/{staffUid}/daily/{date}
            //    Scoped to the individual staff so each staff member has their own stats
            const staffDailyRef = isStaff
                ? doc(db, "staffDashboardStats", user.uid, "daily", todayKey)
                : null;

            // ✅ Sale recorded under owner's sales collection
            const salesRef = doc(collection(db, "sales", ownerId, "userSales"));
            const saleId = salesRef.id;

            await runTransaction(db, async (tx) => {

                // ── 1. Stock check ──
                const productSnap = await tx.get(productRef);

                if (!productSnap.exists()) {
                    throw new Error("Product not found.");
                }

                const currentQty = productSnap.data().quantity || 0;
                const pushToMarketplace = productSnap.data().pushToMarketplace || false;

                if (currentQty < 1) {
                    throw new Error(`"${selectedProduct.name}" is out of stock.`);
                }

                // ── 2. Write sale record ──
                tx.set(salesRef, {
                    saleId,
                    soldBy: user.uid,
                    soldByRole: isStaff ? "staff" : "admin",
                    // ✅ Only present when seller is staff
                    ...(isStaff && staffName ? { staffName } : {}),
                    businessId: ownerId,
                    items: [
                        {
                            productId: selectedProduct.id,
                            name: selectedProduct.name,
                            quantity: 1,
                            sellingPrice: editedPrice,
                            costPrice: selectedProduct.costPrice || 0,
                            profit,
                            totalProfit: profit,
                            total: editedPrice,
                            departmentId: selectedProduct.departmentId || "",
                        },
                    ],
                    totalAmount: editedPrice,
                    totalProfit: profit,
                    totalQuantity: 1,
                    createdAt: serverTimestamp(),
                });

                // ── 3. Deduct stock ──
                tx.update(productRef, {
                    quantity: increment(-1),
                });

                // ── 4. Update daily stats (owner's) ──
                tx.set(
                    adminDailyRef,
                    {
                        salesCount: increment(1),
                        revenue: increment(editedPrice),
                        profit: increment(profit),
                        [`topProducts.${selectedProduct.id}.quantity`]: increment(1),
                        [`topProducts.${selectedProduct.id}.revenue`]: increment(editedPrice),
                        [`topProducts.${selectedProduct.id}.name`]: selectedProduct.name,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );

                //  5. Update STAFF daily stats (only when seller is staff) ──
                //    Mirrors the same shape as dashboardStats so the same
                //    dashboard components can consume it without changes.
                if (isStaff && staffDailyRef) {
                    tx.set(
                        staffDailyRef,
                        {
                            salesCount: increment(1),
                            revenue: increment(editedPrice),
                            profit: increment(profit),
                            [`topProducts.${selectedProduct.id}.quantity`]: increment(1),
                            [`topProducts.${selectedProduct.id}.revenue`]: increment(editedPrice),
                            [`topProducts.${selectedProduct.id}.name`]: selectedProduct.name,
                            // ✅ Extra metadata useful for staff-specific queries
                            staffUid: user.uid,
                            staffName: staffName || "Staff Member",
                            businessId: ownerId,
                            updatedAt: serverTimestamp(),
                        },
                        { merge: true }
                    );
                }

                // ── 6. Update marketplace sold count ──
                if (pushToMarketplace) {
                    tx.update(marketplaceRef, {
                        sold: increment(1),
                        updatedAt: serverTimestamp(),
                    });
                }
            });

            // ── 7. Stamp product version so UI refreshes ──
            await stampProductVersion(ownerId);

            setSaleModalOpen(false);
            setSelectedProduct(null);
            setProcessing(false);

            openConfirm(`Sale of "${selectedProduct.name}" completed successfully ✅`);

        } catch (err) {
            console.error("Direct sale failed:", err.message);
            openConfirm(err.message || "❌ Unable to complete sale.");
            setProcessing(false);
        }
    };

    return (
        <DirectSaleContext.Provider
            value={{
                selectedProduct,
                isSaleModalOpen,
                startSale,
                cancelSale,
                confirmSale,
                processing,
                ownerLoading,
                isStaff,
            }}
        >
            {children}
        </DirectSaleContext.Provider>
    );
};