import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import DashboardLayout from "./O_DashboardLayout";
import SaleModal from "./SaleModal";
import ProductImageCarousel from "./ProductImageCarousel";
import CountrySelect from "./CountrySelect";
import CurrencySelect from "./CurrencySelect";
import callCode from "../../callCode";
import { useSearch } from "../../context/SearchContext";
import { useCart } from "../../context/CartContext";
import { useDirectSale } from "../../context/DirectSaleContext";
import { useNotification } from "../../context/NotificationContext";
import { useConfirmModal } from "../../context/ConfirmationContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useProducts } from "../../context/ProductContext";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { FaEdit, FaUser, FaBuilding, FaPhone, FaMapMarkedAlt, FaGlobe, FaSave, FaKey, FaShoppingCart, FaMoneyBillWave } from "react-icons/fa";
import { MdEmail, MdSave, MdEdit } from "react-icons/md";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { setScope, results } = useSearch();
  const user = auth.currentUser;

  const [adminData, setAdminData] = useState({
    name: "",
    phone: {
      code: "+123",
      number: "",
      full: ""
    },
    email: user?.email || ""
  });


  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessType: "",
    country: "",
    address: "",
    currency: ""
  });

  const [initialAdminData, setInitialAdminData] = useState(null);
  const [initialBusinessData, setInitialBusinessData] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { startSale } = useDirectSale();
  const { notify } = useNotification();
  const { openConfirm } = useConfirmModal();
  const { currency } = useCurrency();
  const { products, lowStockThreshold } = useProducts();

  // Set search scope
  useEffect(() => {
    setScope("all-products");
  }, [setScope]);

  // Fetch profile from Firestore
  useEffect(() => {
    if (!user || editingAdmin || editingBusiness) return;

    async function loadProfile() {
      const docRef = doc(db, "businessProfiles", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        if (!editingAdmin) {
          const phone = data.admin?.phone || {};

          setAdminData({
            name: data.admin?.fullName || "",
            phone: {
              code: phone.code || "empty",
              number: phone.number || "",
              full: phone.full || `${phone.code || "+1"}${phone.number || ""}`,
            },
            email: user.email,
          });
        }

        if (!editingBusiness) {
          setBusinessData({
            businessName: data.business.businessName || "",
            businessType: data.business.businessType || "",
            country: data.business.country || "",
            currency: data.business.currency || "",
            businessAddress: data.business.businessAddress || "",
          });
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [user, editingAdmin, editingBusiness]);

  // Save Admin Info
  const saveAdminInfo = async (data) => {
    setSaving(true);

    const docRef = doc(db, "businessProfiles", user.uid);
    await updateDoc(docRef, {
      "admin.fullName": data.name,
      "admin.phone": {
        code: data.phone.code,
        number: data.phone.number,
        full: `${data.phone.code}${data.phone.number}`,
      }
    });

    setAdminData((prev) => ({
      ...prev,
      name: data.name,
      phone: {
        ...data.phone,
        full: `${data.phone.code}${data.phone.number}`,
      },
    }));

    setSaving(false);
    openConfirm("Admin profile has been updated.");
    notify(`Admin profile has been updated.`, "profile");
    setEditingAdmin(false);
  };

  // Save Business Info
  const saveBusinessInfo = async (data) => {
    setSaving(true);

    const docRef = doc(db, "businessProfiles", user.uid);
    await updateDoc(docRef, {
      "business.businessName": data.businessName,
      "business.businessType": data.businessType,
      "business.country": data.country,
      "business.businessAddress": data.businessAddress,
      "business.currency": {
        name: data.currency.name,
        symbol: data.currency.symbol,
      },

    });
    setBusinessData(data);

    setSaving(false);
    openConfirm("Business information has been updated.");
    notify(`Business information has been updated.`, "profile");
    setEditingBusiness(false);
  };

  const logout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const isPasswordFormInvalid =
    !oldPassword ||
    !newPassword ||
    !confirmPassword ||
    newPassword.length < 6 ||
    newPassword !== confirmPassword ||
    oldPassword === newPassword ||
    changingPassword;


  // Change Password
  const changePassword = async () => {
    if (!user) return;

    // 🔐 BASIC VALIDATION
    if (!oldPassword.trim()) {
      openConfirm("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      openConfirm("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      openConfirm("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      openConfirm("New password and confirm password do not match.");
      return;
    }

    if (oldPassword === newPassword) {
      openConfirm("New password must be different from your old password.");
      return;
    }

    try {
      setChangingPassword(true);

      // 🔐 Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        oldPassword
      );
      await reauthenticateWithCredential(user, credential);

      // 🔐 Update password
      await updatePassword(user, newPassword);

      openConfirm(
        "Password updated successfully. Please login again with your new password."
      );
      notify("Password updated successfully", "profile");

      // Reset & logout
      setShowPasswordModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logout();

    } catch (error) {
      // 🎯 Friendly Firebase error handling
      switch (error.code) {
        case "auth/wrong-password":
          openConfirm("Incorrect current password.");
          break;
        case "auth/too-many-requests":
          openConfirm("Too many attempts. Please try again later.");
          break;
        default:
          openConfirm(error.message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const InputGroup = ({ label, children }) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
      <span>{label}</span>
      {children}
    </label>
  );

  // ── Shared product card (search results) ─────────────────────────────────────
function ProductCard({ product, currency, addToCart, startSale, lowStockThreshold }) {
  const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold;
  const isOut      = product.quantity === 0;

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
        ${isOut ? "opacity-70 border-gray-100" : "border-gray-100 hover:shadow-md hover:border-[#03165A]/15"}`}
    >
      <div className={`h-1 w-full ${isOut ? "bg-red-400" : isLowStock ? "bg-amber-400" : "bg-gradient-to-r from-[#03165A] to-green-500"}`} />
      <div className="relative">
        <ProductImageCarousel images={[product.image, product.image2].filter(Boolean)} />
        {isLowStock && !isOut && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full animate-pulse">
            Low · {product.quantity}
          </span>
        )}
        {isOut && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
            Out of Stock
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Qty: <span className={`font-semibold ${isOut ? "text-red-500" : isLowStock ? "text-amber-600" : "text-gray-700"}`}>{product.quantity}</span></span>
          <span className="font-black text-[#03165A]">{currency.symbol}{product.sellingPrice.toLocaleString()}</span>
        </div>
        {isOut ? (
          <div className="w-full text-center bg-red-50 text-red-500 border border-red-200 py-2 rounded-xl text-xs font-bold">Out of Stock</div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => addToCart(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaShoppingCart className="text-[10px]" /> Add
            </button>
            <button onClick={() => startSale(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:text-sm text-gray-800 text-xs font-bold transition active:scale-95 shadow-sm shadow-[#03165A]/20">
              <FaMoneyBillWave className="text-[10px]" /> Sell
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

  const searchActive = results.length > 0;
  const displayList = searchActive ? results : products;

  const ProfileRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-4">
      <div className="mt-1 text-gray-400 dark:text-gray-500">
        {icon}
      </div>

      <div className="flex-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-base font-medium text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );

    // ── Search results view ─────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#03165A]">Search Results</h2>
            <p className="text-sm text-gray-400 mt-0.5">{results.length} product{results.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} currency={currency}
                addToCart={addToCart} startSale={startSale} lowStockThreshold={lowStockThreshold} />
            ))}
          </div>
        </div>
        <SaleModal />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-2 mb-12">
        {/* Admin Profile */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Admin Profile
            </h2>
            <div className="flex gap-3 flex-wrap justify-end">
              <button
                onClick={() => {
                  const initial = {
                    name: adminData.name || "",
                    phone: {
                      code: adminData.phone.code,
                      number: adminData.phone.number,
                    },
                  }

                  setEditingAdmin(true);
                  setInitialAdminData(initial);
                }}
                className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg"
              >
                <FaEdit />
                Edit
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-4">
              <ProfileRow
                icon={<FaUser />}
                label="Full Name"
                value={adminData.name || "—"}
              />

              <ProfileRow
                icon={<FaPhone />}
                label="Phone Number"
                value={
                  adminData.phone?.full || "—"
                }
              />

              <ProfileRow
                icon={<MdEmail />}
                label="Email Address"
                value={adminData.email}
              />
            </div>

          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Business Information
            </h2>

            <div className="flex gap-3 flex-wrap justify-end">
              <button
                onClick={() => {
                  setInitialBusinessData(businessData);
                  setEditingBusiness(!editingBusiness);
                }}
                className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg"
              >
                <FaEdit />
                Edit
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <ProfileRow
              icon={<FaBuilding />}
              label="Business Name"
              value={businessData.businessName || "—"}
            />

            <ProfileRow
              icon={<FaGlobe />}
              label="Business Type"
              value={businessData.businessType || "—"}
            />

            <ProfileRow
              icon={<FaMapMarkedAlt />}
              label="Country"
              value={businessData.country || "—"}
            />

            <ProfileRow
              icon={<FaMapMarkedAlt />}
              label="Business Address"
              value={businessData.businessAddress || "—"}
            />

            <ProfileRow
              icon={<FaMoneyBillWave />}
              label="Currency"
              value={
                businessData.currency
                  ? `${businessData.currency.name} (${businessData.currency.symbol})`
                  : "—"
              }
            />

          </div>
        </div>

        {/* Change Password */}
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg"
          >
            <FaKey /> Change Password
          </button>
          <Link to="/support" className="text-blue-500 font-semibold">Contact Us</Link>
        </div>
        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-lg">
              <h3 className="text-lg font-bold mb-4">Change Password</h3>

              <input
                type="password"
                placeholder="Old password"
                className="w-full p-2 mb-3 rounded bg-gray-200 dark:bg-gray-700"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />

              <input
                type="password"
                placeholder="New password"
                className="w-full p-2 mb-3 rounded bg-gray-200 dark:bg-gray-700"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full p-2 rounded bg-gray-200 dark:bg-gray-700"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <p className="mb-2 text-gray-500 text-xs">Password must be at least 8 characters long.</p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded"
                >
                  Cancel
                </button>
                <button
                  disabled={isPasswordFormInvalid}
                  onClick={changePassword}
                  className={`px-4 py-2 bg-blue-600 text-white rounded
                    ${isPasswordFormInvalid ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-700"
                    }`}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingAdmin && (
        <EditProfileModal
          adminData={adminData}
          onClose={() => setEditingAdmin(false)}
          onSave={saveAdminInfo}
          initialAdminData={initialAdminData}
          saving={saving}
        />
      )}

      {editingBusiness && (
        <EditBusinessModal
          businessData={businessData}
          onClose={() => setEditingBusiness(false)}
          onSave={saveBusinessInfo}
          initialBusinessData={initialBusinessData}
          saving={saving}
        />
      )}

    </DashboardLayout>
  );
}

const EditProfileModal = ({ adminData, onClose, onSave, saving, initialAdminData }) => {
  const [form, setForm] = useState({
    name: adminData.name || "",
    number: adminData.phone?.number || "",
  });

  //const [code, setCode] = useState(adminData.phone.code || "+1");

  const initialIndex = useMemo(() => {
    const idx = callCode.findIndex(
      c => c.code === adminData.phone?.code
    );
    return idx >= 0 ? idx : 0;
  }, [adminData.phone?.code]);

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const selectedCode = callCode[selectedIndex]?.code || "+1";

  // Check if Admin Edit Form is unchanged
  const isAdminUnchanged = () => {
    if (!initialAdminData) return false;

    return (
      form.name === initialAdminData.name &&
      selectedCode === initialAdminData.phone?.code &&
      form.number === initialAdminData.phone.number
    );
  };

  const unchanged = isAdminUnchanged();

  // Handle save
  const handleSave = async () => {
    await onSave({
      name: form.name,
      phone: {
        code: selectedCode,
        number: form.number,
        full: `${selectedCode}${form.number}`,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Profile
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          <ModalInput
            label="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>

            <div className="flex gap-2">
              {/* COUNTRY CODE */}
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {callCode.map((c, index) => (
                  <option key={`${c, index}-${c.label}`} value={index}>
                    {c.label} {c.code}
                  </option>
                ))}
              </select>

              {/* PHONE DIGITS */}
              <input
                type="tel"
                value={form.number}
                onChange={(e) =>
                  setForm({
                    ...form,
                    number: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="8012345678"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700`}>
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBusinessModal({ businessData, onClose, onSave, saving, initialBusinessData }) {
  const [form, setForm] = useState({
    businessName: businessData.businessName || "",
    businessType: businessData.businessType || "",
    country: businessData.country || "",
    businessAddress: businessData.businessAddress || "",
    currency: businessData.currency || null,
  });

  // Check if Business Edit Form is unchanged
  const isBusinessUnchanged = () => {
    if (!initialBusinessData) return false;

    return (
      form.businessName === initialBusinessData.businessName &&
      form.businessType === initialBusinessData.businessType &&
      form.country === initialBusinessData.country &&
      form.businessAddress === initialBusinessData.businessAddress &&
      JSON.stringify(form.currency) === JSON.stringify(initialBusinessData.currency)
    );
  };

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Business Information
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">
          <ModalInput
            label="Business Name"
            value={form.businessName}
            onChange={(e) =>
              setForm({ ...form, businessName: e.target.value })
            }
          />

          <ModalInput
            label="Business Type"
            value={form.businessType}
            onChange={(e) =>
              setForm({ ...form, businessType: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Country
            </label>
            <CountrySelect
              value={form.country}
              onChange={(value) =>
                setForm({ ...form, country: value })
              }
            />
          </div>

          <ModalInput
            label="Business Address"
            value={form.businessAddress}
            onChange={(e) =>
              setForm({ ...form, businessAddress: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Currency
            </label>
            <CurrencySelect
              value={form.currency}
              onChange={(selected) =>
                setForm({ ...form, currency: selected })
              }
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isBusinessUnchanged()}
            className={`px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700
              ${isBusinessUnchanged() ?
                "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
              }
              `}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


const ModalInput = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

