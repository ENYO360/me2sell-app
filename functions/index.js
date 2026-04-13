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

const algoliasearch = require("algoliasearch");
const { defineString } = require("firebase-functions/params");

const ALGOLIA_APP_ID  = defineString("ALGOLIA_APP_ID");
const ALGOLIA_API_KEY = defineString("ALGOLIA_API_KEY");
const ALGOLIA_INDEX   = "marketplace_products";

exports.syncProductToAlgolia = onDocumentWritten(
    "marketplaceProducts/{productId}",
    async (event) => {
        const productId = event.params.productId;
        const after  = event.data?.after;
        const before = event.data?.before;

        const algoliaClient = algoliasearch(
            ALGOLIA_APP_ID.value(),
            ALGOLIA_API_KEY.value()
        );
        const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX);

        // Deleted — remove from Algolia index
        if (!after?.exists) {
            await algoliaIndex.deleteObject(productId);
            return;
        }

        const data = after.data();

        const record = {
            objectID:       productId,
            name:           data.name           || "",
            description:    data.description    || "",
            categoryId:     data.categoryId     || "",
            department:     data.department     || "",
            businessName:   data.businessName   || "",
            businessType:   data.businessType   || "",
            sellerId:       data.sellerId       || "",
            sellingPrice:   data.sellingPrice   || 0,
            currencySymbol: data.currencySymbol || "",
            image:          data.image          || "",
            image2:         data.image2         || "",
            quantity:       data.quantity       || 0,
            sold:           data.sold           || 0,
            address:        data.address        || "",
            country:        data.country        || "",
            phone:          data.phone          || "",
            whatsappLink:   data.whatsappLink   || "",
            location:       data.location       || null,
            updatedAt:      data.updatedAt?.toMillis?.() || Date.now(),
        };

        await algoliaIndex.saveObject(record);
    }
);