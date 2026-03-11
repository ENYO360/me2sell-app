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

  // ✅ Track the last fetched version so we don't re-fetch unnecessarily
  const lastFetchedVersion = useRef(null);

  const { canAccessDepartment, canAccessCategory, isAdmin, isStaff, loading: permissionsLoading } = usePermissions();

  /* ======================
     🧠 LOAD FROM CACHE FIRST
     ====================== */
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setAllProducts(JSON.parse(cached));
      setLoading(false);
    }

    const cachedProfile = localStorage.getItem(PROFILE_CACHE);
    if (cachedProfile) {
      setProfile(JSON.parse(cachedProfile));
      setLoadingProfile(false);
    }

    const cachedThreshold = localStorage.getItem(THRESHOLD_CACHE);
    if (cachedThreshold) {
      setLowStockThreshold(Number(cachedThreshold));
    }

    const cachedVersion = localStorage.getItem(VERSION_CACHE);
    if (cachedVersion) {
      lastFetchedVersion.current = cachedVersion;
    }
  }, []);

  /* ======================
     🔥 FETCH FULL PRODUCT LIST
     Only called when version changes
     ====================== */
  const fetchProducts = useCallback(async (ownerId) => {
    try {
      const snap = await getDocs(
        collection(db, "products", ownerId, "productList")
      );

      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(list);
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  /* ======================
     🔄 MAIN SETUP: AUTH + SNAPSHOT ON VERSION DOC ONLY
     
     Cost breakdown:
     - 1 read on mount (version doc)
     - 1 read per product change (version doc update) 
     - Full product list read ONLY when version changes
     - Profile read once per session
     ====================== */
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      // Clean up previous snapshot if user changes
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
        let ownerId = user.uid;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "staff") {
          const businessId = userDoc.data().businessId;
          if (businessId) ownerId = businessId;
        }

        // ✅ Fetch profile once (not real-time — changes rarely)
        const profileRef = doc(db, "businessProfiles", ownerId);
        const profileSnap = await getDoc(profileRef);

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

        // ✅ Watch only the lightweight version document
        // This is a single document with just { version, updatedAt }
        // Your cloud function updates this whenever any product changes
        const versionRef = doc(db, "productVersions", ownerId);

        unsubscribeSnapshot = onSnapshot(versionRef, async (snap) => {
          if (!snap.exists()) {
            // No version doc yet — do initial fetch and create the version doc
            await fetchProducts(ownerId);
            await setDoc(versionRef, {
              version: Date.now().toString(),
              updatedAt: new Date(),
            });
            setLoading(false);
            return;
          }

          const remoteVersion = snap.data().version;

          // ✅ Only re-fetch products if version actually changed
          if (remoteVersion !== lastFetchedVersion.current) {
            console.log("🔄 Product version changed — refetching");
            lastFetchedVersion.current = remoteVersion;
            localStorage.setItem(VERSION_CACHE, remoteVersion);
            await fetchProducts(ownerId);
          }

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

  /* ======================
     🔥 UPDATE LOW STOCK THRESHOLD
     ====================== */
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

      const profileRef = doc(db, "businessProfiles", ownerId);
      await setDoc(profileRef, {
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

  /* ======================
     🔒 FILTER PRODUCTS BY PERMISSIONS
     ====================== */
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

  /* ======================
     🔍 FILTER HELPERS
     ====================== */
  const getProductsByDepartment = useCallback(
    (departmentId) => getFilteredProducts().filter((p) => p.departmentId === departmentId),
    [getFilteredProducts]
  );

  const getProductsByCategory = useCallback(
    (categoryId) => getFilteredProducts().filter((p) => p.categoryId === categoryId),
    [getFilteredProducts]
  );

  const getProductStats = useCallback(() => {
    const filteredProducts = getFilteredProducts();
    return {
      totalProducts: filteredProducts.length,
      totalValue: filteredProducts.reduce(
        (sum, p) => sum + (p.sellingPrice || 0) * (p.quantity || 0), 0
      ),
      lowStockItems: filteredProducts.filter(
        (p) => p.quantity > 0 && p.quantity <= lowStockThreshold
      ).length,
      outOfStockItems: filteredProducts.filter((p) => p.quantity === 0).length,
    };
  }, [getFilteredProducts, lowStockThreshold]);

  const getLowStockProducts = useCallback(() =>
    getFilteredProducts().filter(
      (p) => p.quantity > 0 && p.quantity <= lowStockThreshold
    ),
    [getFilteredProducts, lowStockThreshold]
  );

  const searchProducts = useCallback(
    (searchTerm) => {
      const lowerSearch = searchTerm.toLowerCase();
      return getFilteredProducts().filter(
        (product) =>
          product.name?.toLowerCase().includes(lowerSearch) ||
          product.barcode?.toLowerCase().includes(lowerSearch) ||
          product.sku?.toLowerCase().includes(lowerSearch)
      );
    },
    [getFilteredProducts]
  );

  const canAccessProduct = useCallback(
    (productId) => {
      if (isAdmin) return true;
      const product = allProducts.find((p) => p.id === productId);
      if (!product) return false;
      if (isStaff) {
        if (product.departmentId && !canAccessDepartment(product.departmentId)) return false;
        if (product.categoryId && !canAccessCategory(product.categoryId)) return false;
      }
      return true;
    },
    [allProducts, isAdmin, isStaff, canAccessDepartment, canAccessCategory]
  );

  const isLowStock = useCallback(
    (quantity) => quantity > 0 && quantity <= lowStockThreshold,
    [lowStockThreshold]
  );

  /* ======================
     📦 CONTEXT VALUE
     ====================== */
  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};