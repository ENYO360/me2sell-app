const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

exports["staffManagement-updateStaffStatus"] = onCall(
  {
    cors: [/localhost/, "https://sales-book-d66c5.web.app", "https://sales-book-d66c5.firebaseapp.com"],
  },
  async (request) => {

    // 1. Auth guard
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const callerUid = request.auth.uid;
    const { staffId, status } = request.data;

    // 2. Input validation
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

    // 3. Fetch the staff document
    const staffRef = db.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      throw new HttpsError("not-found", "Staff member not found.");
    }

    const staffData = staffSnap.data();

    // 4. Ownership check
    if (staffData.businessId !== callerUid) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to manage this staff member."
      );
    }

    // 5. No-op guard
    if (staffData.status === status) {
      return {
        success: true,
        message: `Staff is already ${status}. No changes made.`,
        staffId,
        status,
      };
    }

    // 6. Batch update both collections atomically
    const batch = db.batch();

    batch.update(staffRef, {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const userRef = db.collection("users").doc(staffId);
    batch.update(userRef, {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // 7. Log the activity
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