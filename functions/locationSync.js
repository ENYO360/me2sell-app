const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// ✅ Safe fetch for Node < 18 compatibility
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ================================
   CALLABLE: Update User Location
   Uses client-provided GPS coordinates
================================ */
exports.updateUserLocation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;
  const { latitude, longitude } = request.data;

  // Validate coordinates
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid GPS coordinates provided"
    );
  }

  try {
    // Reverse geocoding via OpenStreetMap Nominatim
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Me2Sell-App/1.0", // Required by Nominatim TOS
        },
      }
    );

    const data = await res.json();

    if (!data || data.error) {
      throw new Error("Geocoding failed");
    }

    const address = data.address || {};

    const locationInfo = {
      city: address.city || address.town || address.village || "",
      state: address.state || address.region || "",
      country: address.country || "",
      countryCode: address.country_code?.toUpperCase() || "",
      latitude: Number(latitude),
      longitude: Number(longitude),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      stale: false, // ✅ clear stale flag on fresh update
      source: "gps",
    };

    const profileRef = admin.firestore().doc(`businessProfiles/${uid}`);
    const snap = await profileRef.get();

    let shouldUpdate = true;

    // ✅ Admin SDK: snap.exists is a property, NOT a function
    if (snap.exists) {
      const existing = snap.data()?.business?.location;

      if (existing) {
        const coordsChanged =
          Math.abs(existing.latitude - locationInfo.latitude) > 0.05 ||
          Math.abs(existing.longitude - locationInfo.longitude) > 0.05;

        const cityChanged = existing.city !== locationInfo.city;

        shouldUpdate = coordsChanged || cityChanged;
      }
    }

    if (shouldUpdate) {
      await profileRef.set(
        { business: { location: locationInfo } },
        { merge: true }
      );

      console.log(`Location updated for user ${uid}:`, locationInfo.city);

      return {
        success: true,
        updated: true,
        location: locationInfo,
      };
    }

    return {
      success: true,
      updated: false,
      location: locationInfo,
      message: "Location unchanged",
    };

  } catch (err) {
    console.error("Location error:", err);
    throw new HttpsError("internal", "Location update failed: " + err.message);
  }
});

/* ================================
   SCHEDULED: Weekly — Flag stale locations
   Marks locations older than 30 days so the
   client shows a "please update location" modal
================================ */
exports.scheduledLocationUpdate = onSchedule(
  {
    schedule: "0 2 * * 0", // Every Sunday 2AM UTC
    timeZone: "UTC",
  },
  async () => {
    const db = admin.firestore();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let lastDoc = null;
    let flagged = 0;
    const batchSize = 300;

    while (true) {
      let q = db
        .collection("businessProfiles")
        .where("lastActivity", ">=", thirtyDaysAgo)
        .orderBy("lastActivity", "desc")
        .limit(batchSize);

      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      for (const docSnap of snap.docs) {
        // ✅ renamed loop variable to docSnap to avoid shadowing admin doc()
        const location = docSnap.data()?.business?.location;

        if (!location?.timestamp) continue;

        const locationAge = Date.now() - location.timestamp.toMillis();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        if (locationAge > thirtyDaysMs) {
          await docSnap.ref.update({
            "business.location.stale": true,
          });

          flagged++;
          console.log("Flagged stale location:", docSnap.id);
        }
      }

      lastDoc = snap.docs[snap.size - 1];
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`Flagged ${flagged} stale locations`);
  }
);