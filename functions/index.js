const admin = require("firebase-admin");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();

exports.syncMarketplaceProduct = onDocumentWritten(
  "products/{uid}/productList/{productId}",
  async (event) => {
    const { uid, productId } = event.params;
    const db = admin.firestore();

    const before = event.data?.before;
    const after = event.data?.after;

    // 🗑 PRODUCT DELETED — remove from marketplace regardless
    if (!after.exists) {
      await db.collection("marketplaceProducts").doc(productId).delete();
      return;
    }

    const product = after.data();

    // 🚫 NOT pushed to marketplace — delete if it was previously listed
    if (!product.pushToMarketplace) {
      await db.collection("marketplaceProducts").doc(productId).delete();
      return;
    }

    // 🔎 Fetch seller info
    const sellerSnap = await db.doc(`businessProfiles/${uid}`).get();
    if (!sellerSnap.exists) return;

    const seller = sellerSnap.data();

    const marketplaceData = {
      productId,
      sellerId: uid,

      name: product.name,
      nameLower: (product.name || "").toLowerCase(),
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      description: product.description || "",

      image: product.image || "",
      image2: product.image2 || "",

      categoryId: product.categoryId || "",
      department: product.department || "",

      businessName: seller.business?.businessName || "",
      businessType: seller.business?.businessType || "",
      phone: seller.admin.phone?.full || "",
      address: seller.business?.businessAddress || "",
      country: seller.business?.country || "",
      currencyName: seller.business?.currency?.name || "",
      currencySymbol: seller.business?.currency?.symbol || "",
      whatsappLink: seller.admin.phone?.full
        ? `https://wa.me/${seller.admin.phone?.full.replace(/\D/g, "")}`
        : "",
      location: {
        latitude: seller.business?.location?.latitude ?? null,
        longitude: seller.business?.location?.longitude ?? null,
        city: seller.business?.location?.city || "",
        country: seller.business?.location?.country || "",
      },

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

      // Only set createdAt once
      ...(before.exists
        ? {}
        : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
    };

    await db
      .collection("marketplaceProducts")
      .doc(productId)
      .set(marketplaceData, { merge: true });
  }
);

exports.sellerInfo = require("./sellerInfo");
exports.locationSync = require("./locationSync");

// ── Staff Management ──────────────────────────────────────────────────────────
exports["staffManagement-updateStaffStatus"] = onCall(
  {
    cors: [/localhost/, "https://sales-book-d66c5.web.app", "https://sales-book-d66c5.firebaseapp.com"],
  },
  async (request) => {
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const callerUid = request.auth.uid;
    const { staffId, status } = request.data;

    if (!staffId || typeof staffId !== "string") {
      throw new HttpsError("invalid-argument", "staffId is required.");
    }

    const allowedStatuses = ["active", "suspended"];
    if (!status || !allowedStatuses.includes(status)) {
      throw new HttpsError(
        "invalid-argument",
        `status must be one of: ${allowedStatuses.join(", ")}.`
      );
    }

    const staffRef = db.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      throw new HttpsError("not-found", "Staff member not found.");
    }

    const staffData = staffSnap.data();

    if (staffData.businessId !== callerUid) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to manage this staff member."
      );
    }

    if (staffData.status === status) {
      return {
        success: true,
        message: `Staff is already ${status}. No changes made.`,
        staffId,
        status,
      };
    }

    const batch = db.batch();
    batch.update(staffRef, { status, updatedAt: FieldValue.serverTimestamp() });

    const userRef = db.collection("users").doc(staffId);
    batch.update(userRef, { status, updatedAt: FieldValue.serverTimestamp() });

    await batch.commit();

    await db.collection("staffActivity").add({
      businessId: callerUid,
      staffId,
      staffName: staffData.fullName || "",
      action: status === "active" ? "staff_activated" : "staff_suspended",
      details: { previousStatus: staffData.status, newStatus: status },
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Staff ${status === "active" ? "activated" : "suspended"} successfully.`,
      staffId,
      status,
    };
  }
);