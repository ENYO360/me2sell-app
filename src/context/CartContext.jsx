import React, { createContext, useContext, useEffect, useState } from "react";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    getDoc,
    getDocs,
    serverTimestamp,
    increment,
    runTransaction,
    writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { useNotification } from "./NotificationContext";
import { useConfirmModal } from "./ConfirmationContext";
import { useCurrency } from "./CurrencyContext";
import { stampProductVersion } from "../utils/stampProductVersion";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [user, setUser] = useState(null);

    // ✅ ownerId = admin UID (for products, sales, stats)
    // ✅ user.uid = whoever is logged in (admin or staff)
    const [ownerId, setOwnerId] = useState(null);
    const [isStaff, setIsStaff] = useState(false);
    const [staffName, setStaffName] = useState(null);

    const [adding, setAdding] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [ownerLoading, setOwnerLoading] = useState(true); // ✅ true until ownerId is resolved

    const { notify } = useNotification();
    const { openConfirm } = useConfirmModal();
    const { currency } = useCurrency();

    /* ─────────────────────────────────────────
       AUTH — resolve who the owner is
    ───────────────────────────────────────── */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                setUser(null);
                setOwnerId(null);
                setIsStaff(false);
                setStaffName(null);
                setCartItems([]);
                setOwnerLoading(false);
                return;
            }

            setUser(currentUser);

            // Check if this user is staff
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
                    // Reuses the same auth flow — no extra effect needed
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
            setOwnerLoading(false); // ✅ ownerId is now safe to use

            // ✅ Cart is always stored under the logged-in user's UID
            // so admin and staff each have their own cart
            const snap = await getDocs(
                collection(db, "users", currentUser.uid, "cart")
            );

            setCartItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });

        return () => unsub();
    }, []);

    /* ─────────────────────────────────────────
       ADD TO CART
    ───────────────────────────────────────── */
    const addToCart = async (product) => {
        if (!user) return alert("Please log in first.");
        if (!ownerId) return alert("Still loading your account. Please try again.");

        setAdding(product.id);

        // Cart stored under logged-in user (not ownerId)
        const ref = doc(db, "users", user.uid, "cart", product.id);
        await setDoc(
            ref,
            {
                productId: product.id,
                name: product.name,
                sellingPrice: product.sellingPrice,
                costPrice: product.costPrice || 0,
                quantity: increment(1),
                departmentId: product.departmentId || "",
                createdAt: serverTimestamp(),
            },
            { merge: true }
        );

        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    id: product.id,
                    productId: product.id,
                    name: product.name,
                    sellingPrice: Number(product.sellingPrice),
                    costPrice: Number(product.costPrice || 0),
                    quantity: 1,
                    departmentId: product.departmentId || "",
                },
            ];
        });

        setAdding(null);
        openConfirm(`"${product.name}" added to cart.`, { autoClose: 1000 });
    };

    /* ─────────────────────────────────────────
       INCREASE QTY
    ───────────────────────────────────────── */
    const increaseQuantity = async (id) => {
        if (!user) return;

        await updateDoc(doc(db, "users", user.uid, "cart", id), {
            quantity: increment(1),
        });

        setCartItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
        );
    };

    /* ─────────────────────────────────────────
       DECREASE QTY
    ───────────────────────────────────────── */
    const decreaseQuantity = async (id) => {
        if (!user) return;

        const item = cartItems.find((i) => i.id === id);
        if (!item) return;

        if (item.quantity <= 1) {
            await deleteDoc(doc(db, "users", user.uid, "cart", id));
            setCartItems((prev) => prev.filter((i) => i.id !== id));
        } else {
            await updateDoc(doc(db, "users", user.uid, "cart", id), {
                quantity: increment(-1),
            });
            setCartItems((prev) =>
                prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
            );
        }
    };

    /* ─────────────────────────────────────────
       REMOVE ITEM
    ───────────────────────────────────────── */
    const removeFromCart = async (id) => {
        if (!user) return;
        await deleteDoc(doc(db, "users", user.uid, "cart", id));
        setCartItems((prev) => prev.filter((i) => i.id !== id));
    };

    /* ─────────────────────────────────────────
       CLEAR CART
    ───────────────────────────────────────── */
    const clearCart = async () => {
        if (!user || cartItems.length === 0) return;

        const batch = writeBatch(db);
        cartItems.forEach((item) => {
            batch.delete(doc(db, "users", user.uid, "cart", item.id));
        });
        await batch.commit();
        setCartItems([]);
    };

    /* ─────────────────────────────────────────
       CHECKOUT
       - Products deducted from OWNER's productList
       - Sale recorded to OWNER's sales collection
       - soldBy = logged-in user UID (admin or staff)
       - Stats updated under OWNER's dashboardStats
    ───────────────────────────────────────── */
    const checkoutCart = async (editedPrices = {}) => {
        if (!user) return alert("Login first.");
        if (cartItems.length === 0) return alert("Cart is empty.");
        if (!ownerId) return alert("Could not resolve business owner. Try again.");

        setConfirming(true);

        try {
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            // ✅ Sale goes under OWNER's collection
            const salesCollectionRef = collection(db, "sales", ownerId, "userSales");
            const salesRef = doc(salesCollectionRef);
            const saleId = salesRef.id;

            // ✅ Stats go under OWNER's dashboardStats
            const dailyRef = doc(db, "dashboardStats", ownerId, "daily", todayKey);

            // Build items with resolved prices
            const items = cartItems.map((item) => {
                const price = Number(editedPrices[item.id] ?? item.sellingPrice);
                const profit = price - Number(item.costPrice || 0);
                return {
                    productId: item.productId,
                    name: item.name,
                    sellingPrice: price,
                    quantity: item.quantity,
                    total: price * item.quantity,
                    costPrice: Number(item.costPrice || 0),
                    profit,
                    totalProfit: profit * item.quantity,
                    departmentId: item.departmentId || "",
                };
            });

            const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
            const totalProfit = items.reduce((sum, i) => sum + i.totalProfit, 0);
            const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

            await runTransaction(db, async (tx) => {
                // ── 1. Stock checks (all under ownerId's productList) ──
                const stockChecks = await Promise.all(
                    items.map(async (item) => {
                        const productRef = doc(
                            db,
                            "products",
                            ownerId,            // ✅ always owner's products
                            "productList",
                            item.productId
                        );
                        const productSnap = await tx.get(productRef);

                        if (!productSnap.exists()) {
                            throw new Error(`Product "${item.name}" not found.`);
                        }

                        const currentQty = productSnap.data().quantity || 0;
                        if (currentQty < item.quantity) {
                            throw new Error(
                                `Not enough stock for "${item.name}". Available: ${currentQty}, needed: ${item.quantity}.`
                            );
                        }

                        return { productRef, pushToMarketplace: productSnap.data().pushToMarketplace || false };
                    })
                );

                // ── 2. Write sale record ──
                tx.set(salesRef, {
                    saleId,
                    soldBy: user.uid,
                    soldByRole: isStaff ? "staff" : "admin",
                    // ✅ Only present when seller is staff, null for admin
                    ...(isStaff && staffName ? { staffName } : {}),
                    businessId: ownerId,
                    items,
                    totalAmount,
                    totalProfit,
                    totalQuantity,
                    createdAt: serverTimestamp(),
                });

                // ── 3. Deduct stock (owner's products) ──
                items.forEach((item, index) => {
                    const { productRef } = stockChecks[index];
                    tx.update(productRef, {
                        quantity: increment(-item.quantity),
                    });
                });

                // ── 4. Update daily dashboard stats (owner's) ──
                const dailyUpdate = {
                    salesCount: increment(totalQuantity),
                    revenue: increment(totalAmount),
                    profit: increment(totalProfit),
                    updatedAt: serverTimestamp(),
                };

                items.forEach((item) => {
                    dailyUpdate[`topProducts.${item.productId}.quantity`] = increment(item.quantity);
                    dailyUpdate[`topProducts.${item.productId}.revenue`] = increment(item.total);
                    dailyUpdate[`topProducts.${item.productId}.name`] = item.name;
                });

                tx.set(dailyRef, dailyUpdate, { merge: true });

                // ── 5. Update marketplace sold counts ──
                items.forEach((item, index) => {
                    if (stockChecks[index].pushToMarketplace) {
                        const marketplaceRef = doc(db, "marketplaceProducts", item.productId);
                        tx.update(marketplaceRef, {
                            sold: increment(item.quantity),
                            updatedAt: serverTimestamp(),
                        });
                    }
                });
            });

            // ── 6. Stamp product version so UI refreshes ──
            await stampProductVersion(ownerId);

            setConfirming(false);
            openConfirm("Sale completed successfully! ✅");
            await clearCart();
            return true;

        } catch (err) {
            setConfirming(false);
            console.error("Checkout failed:", err);
            openConfirm(err.message || "❌ Unable to complete checkout.");
            return false;
        }
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                increaseQuantity,
                decreaseQuantity,
                clearCart,
                checkoutCart,
                user,
                ownerId,
                isStaff,
                staffName,
                ownerLoading,
                adding,
                confirming,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};