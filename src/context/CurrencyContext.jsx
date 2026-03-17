import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState({
    name: "",
    symbol: "",
    loading: true,
  });

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCurrency({ name: "", symbol: "", loading: false });
        localStorage.removeItem("currency");
        return;
      }

      // ✅ Load from cache immediately while we fetch
      const cached = localStorage.getItem("currency");
      if (cached) {
        setCurrency({ ...JSON.parse(cached), loading: false });
      }

      // ✅ Resolve which businessProfile to read from.
      // For admin: user.uid === their own businessProfile UID.
      // For staff: user.uid points to a users doc with a businessId field.
      let profileUid = user.uid;

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === "staff") {
          const businessId = userSnap.data().businessId;
          if (businessId) profileUid = businessId;
        }
      } catch (_) {
        // If users doc is unreadable, fall back to user.uid (admin path)
      }

      // ✅ One-time read from the resolved owner's businessProfile
      const snap = await getDoc(doc(db, "businessProfiles", profileUid));
      if (!snap.exists()) return;

      const liveCurrency = snap.data()?.business?.currency;
      if (!liveCurrency) return;

      const newCurrency = {
        name:    liveCurrency.name,
        symbol:  liveCurrency.symbol,
        loading: false,
      };

      setCurrency(newCurrency);
      localStorage.setItem("currency", JSON.stringify(newCurrency));
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);