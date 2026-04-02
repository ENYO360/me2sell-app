import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { usePermissions } from "../hooks/usePermissions";

const ProductContext = createContext();
export const useProducts = () => useContext(ProductContext);

const CACHE_KEY = "products_cache_v1";
const PROFILE_CACHE = "business_profile_cache_v1";
const THRESHOLD_CACHE = "low_stock_threshold_cache";
const VERSION_CACHE = "products_version_cache";

export const ProductProvider = ({ children }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(15);

  const lastFetchedVersion = useRef(null);

  const {
    canAccessDepartment,
    canAccessCategory,
    isAdmin,
    isStaff,
    loading: permissionsLoading,
  } = usePermissions();

  /* ─────────────────────────────────────────────────────────────
     CACHE — pre-populate UI while Firestore loads.
     Does NOT set loading=false — only the onSnapshot does that.
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setAllProducts(JSON.parse(cached)); } catch { }
    }

    const cachedProfile = localStorage.getItem(PROFILE_CACHE);
    if (cachedProfile) {
      try { setProfile(JSON.parse(cachedProfile)); setLoadingProfile(false); } catch { }
    }

    const cachedThreshold = localStorage.getItem(THRESHOLD_CACHE);
    if (cachedThreshold) setLowStockThreshold(Number(cachedThreshold));

    const cachedVersion = localStorage.getItem(VERSION_CACHE);
    if (cachedVersion) lastFetchedVersion.current = cachedVersion;
  }, []);

  /* ─────────────────────────────────────────────────────────────
     FETCH PRODUCTS
     Called whenever the version doc changes (add, edit, delete).
     Clears stale cache first so deleted products never persist.
  ───────────────────────────────────────────────────────────── */
  const fetchProducts = useCallback(async (ownerId) => {
    try {
      // ✅ Remove stale cache immediately — ensures deleted products
      // are never served from localStorage after a version change
      localStorage.removeItem(CACHE_KEY);

      const snap = await getDocs(
        collection(db, "products", ownerId, "productList")
      );
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "",
            sellingPrice: Number(data.sellingPrice) || 0,
            costPrice: Number(data.costPrice) || 0,
            quantity: Number(data.quantity) || 0,
            categoryId: data.categoryId || "",
            departmentId: data.departmentId || "",
            department: data.department || "",
            category: data.category || "",
            image: data.image || "",
            image2: data.image2 || "",
            description: data.description || "",
            barcode: data.barcode || "",
            sku: data.sku || "",
            uid: data.uid || "",
            pushToMarketplace: data.pushToMarketplace ?? true,
            updatedAt: data.updatedAt || null,
            createdAt: data.createdAt || null,
          };
        })
        .filter((p) => p.name); //drop docs with no name at all
      setAllProducts(list);

      // Write fresh data back to cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     MAIN SETUP — auth + version snapshot
     loading=false only set after snapshot resolves.
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!user) {
        setAllProducts([]);
        setProfile(null);
        setLowStockThreshold(5);
        lastFetchedVersion.current = null;
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(PROFILE_CACHE);
        localStorage.removeItem(THRESHOLD_CACHE);
        localStorage.removeItem(VERSION_CACHE);
        setLoading(false);
        setLoadingProfile(false);
        return;
      }

      try {
        // Resolve ownerId — staff use their employer's businessId
        let ownerId = user.uid;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "staff") {
          const businessId = userDoc.data().businessId;
          if (businessId) ownerId = businessId;
        }

        // Fetch business profile once per session
        const profileSnap = await getDoc(doc(db, "businessProfiles", ownerId));
        if (profileSnap.exists()) {
          const profileData = { id: profileSnap.id, ...profileSnap.data() };
          setProfile(profileData);
          localStorage.setItem(PROFILE_CACHE, JSON.stringify(profileData));
          if (profileData.settings?.lowStockThreshold !== undefined) {
            setLowStockThreshold(profileData.settings.lowStockThreshold);
            localStorage.setItem(THRESHOLD_CACHE, profileData.settings.lowStockThreshold);
          }
        }
        setLoadingProfile(false);

        // Watch the lightweight version document.
        // stampProductVersion() updates this on every add/edit/delete.
        // When it changes we re-fetch the full product list.
        const versionRef = doc(db, "productVersions", ownerId);

        unsubscribeSnapshot = onSnapshot(versionRef, async (snap) => {
          if (!snap.exists()) {
            await fetchProducts(ownerId);
            await setDoc(versionRef, {
              version: Date.now().toString(),
              updatedAt: new Date(),
            });
            setLoading(false);
            return;
          }

          const remoteVersion = snap.data().version;

          if (remoteVersion !== lastFetchedVersion.current) {
            console.log("🔄 Version changed — refetching products");
            lastFetchedVersion.current = remoteVersion;
            localStorage.setItem(VERSION_CACHE, remoteVersion);
            // fetchProducts clears stale cache before writing fresh data
            await fetchProducts(ownerId);
          }

          setLoading(false);
        }, (err) => {
          console.error("Version snapshot error:", err);
          setLoading(false);
        });

      } catch (err) {
        console.error("ProductContext setup failed:", err);
        setLoading(false);
        setLoadingProfile(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [fetchProducts]);

  /* ─────────────────────────────────────────────────────────────
     UPDATE LOW STOCK THRESHOLD
  ───────────────────────────────────────────────────────────── */
  const updateLowStockThreshold = useCallback(async (newThreshold) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      let ownerId = user.uid;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().role === "staff") {
        const businessId = userDoc.data().businessId;
        if (businessId) ownerId = businessId;
      }

      await setDoc(doc(db, "businessProfiles", ownerId), {
        settings: { lowStockThreshold: newThreshold }
      }, { merge: true });

      setLowStockThreshold(newThreshold);
      localStorage.setItem(THRESHOLD_CACHE, newThreshold);
      return { success: true };
    } catch (error) {
      console.error("Error updating threshold:", error);
      return { success: false, error: error.message };
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     PERMISSION-FILTERED PRODUCTS
  ───────────────────────────────────────────────────────────── */
  const getFilteredProducts = useCallback(() => {
    if (permissionsLoading) return [];
    if (isAdmin) return allProducts;
    if (isStaff) {
      return allProducts.filter((product) => {
        if (product.departmentId && !canAccessDepartment(product.departmentId)) return false;
        if (product.categoryId && !canAccessCategory(product.categoryId)) return false;
        return true;
      });
    }
    return allProducts;
  }, [allProducts, isAdmin, isStaff, canAccessDepartment, canAccessCategory, permissionsLoading]);

  const getProductsByDepartment = useCallback(
    (departmentId) => getFilteredProducts().filter((p) => p.departmentId === departmentId),
    [getFilteredProducts]
  );

  const getProductsByCategory = useCallback(
    (categoryId) => getFilteredProducts().filter((p) => p.categoryId === categoryId),
    [getFilteredProducts]
  );

  const getProductStats = useCallback(() => {
    const list = getFilteredProducts();
    return {
      totalProducts: list.length,
      totalValue: list.reduce((s, p) => s + (p.sellingPrice || 0) * (p.quantity || 0), 0),
      lowStockItems: list.filter((p) => p.quantity > 0 && p.quantity <= lowStockThreshold).length,
      outOfStockItems: list.filter((p) => p.quantity === 0).length,
    };
  }, [getFilteredProducts, lowStockThreshold]);

  const getLowStockProducts = useCallback(
    () => getFilteredProducts().filter((p) => p.quantity > 0 && p.quantity <= lowStockThreshold),
    [getFilteredProducts, lowStockThreshold]
  );

  const searchProducts = useCallback((searchTerm) => {
    const q = searchTerm.toLowerCase();
    return getFilteredProducts().filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  }, [getFilteredProducts]);

  const canAccessProduct = useCallback((productId) => {
    if (isAdmin) return true;
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return false;
    if (isStaff) {
      if (product.departmentId && !canAccessDepartment(product.departmentId)) return false;
      if (product.categoryId && !canAccessCategory(product.categoryId)) return false;
    }
    return true;
  }, [allProducts, isAdmin, isStaff, canAccessDepartment, canAccessCategory]);

  const isLowStock = useCallback(
    (quantity) => quantity > 0 && quantity <= lowStockThreshold,
    [lowStockThreshold]
  );

  // ── Called by Products.jsx immediately after deleting a product ──
  // Removes the product from state + cache without waiting for the
  // version snapshot to round-trip, so the UI updates instantly.
  const removeProductFromCache = useCallback((productId) => {
    setAllProducts((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Full cache wipe — use if you need to force a fresh fetch on next load
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(VERSION_CACHE);
    lastFetchedVersion.current = null;
  }, []);

  const value = useMemo(() => ({
    products: getFilteredProducts(),
    allProducts: isAdmin ? allProducts : [],
    loading: loading || permissionsLoading,
    getProductsByDepartment,
    getProductsByCategory,
    getProductStats,
    searchProducts,
    canAccessProduct,
    profile,
    loadingProfile,
    isAdmin,
    isStaff,
    lowStockThreshold,
    updateLowStockThreshold,
    getLowStockProducts,
    isLowStock,
    removeProductFromCache,
    clearCache,
  }), [
    getFilteredProducts,
    allProducts,
    loading,
    permissionsLoading,
    getProductsByDepartment,
    getProductsByCategory,
    getProductStats,
    searchProducts,
    canAccessProduct,
    profile,
    loadingProfile,
    isAdmin,
    isStaff,
    lowStockThreshold,
    updateLowStockThreshold,
    getLowStockProducts,
    isLowStock,
    removeProductFromCache,
    clearCache,
  ]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};