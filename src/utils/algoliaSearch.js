import { liteClient as algoliasearch } from "algoliasearch/lite";

const client = algoliasearch(
    process.env.REACT_APP_ALGOLIA_APP_ID,
    process.env.REACT_APP_ALGOLIA_SEARCH_KEY  // Search-only key — safe for frontend
);

/**
 * Search products by any part of the name, description,
 * category, business name etc.
 * Returns Algolia hits shaped like your Firestore product docs.
 */
export async function searchProductsAlgolia(queryText, page = 0) {
    if (!queryText?.trim()) return { hits: [], nbPages: 0 };

    const { results } = await client.search({
        requests: [
            {
                indexName: "marketplace_products",
                query: queryText,
                hitsPerPage: 20,
                page,
                attributesToRetrieve: [
                    "objectID", "name", "description", "categoryId", "department",
                    "businessName", "businessType", "sellerId", "sellingPrice",
                    "currencySymbol", "image", "image2", "quantity", "sold",
                    "address", "country", "phone", "whatsappLink", "location",
                ],
            },
        ],
    });

    const { hits, nbPages } = results[0];

    return {
        hits: hits.map(h => ({ ...h, id: h.objectID })),
        nbPages,
    };
}

/**
 * Search sellers by business name, type, country, address.
 */
export async function searchSellersAlgolia(queryText) {
    if (!queryText?.trim()) return [];

    const { results } = await client.search({
        requests: [
            {
                indexName: "marketplace_products",
                query: queryText,
                hitsPerPage: 50,
                attributesToRetrieve: [
                    "sellerId", "businessName", "businessType",
                    "address", "country", "phone", "whatsappLink",
                ],
                distinct: true,
            },
        ],
    });

    const hits = results[0].hits;

    const map = new Map();
    hits.forEach(h => {
        if (!h.sellerId || map.has(h.sellerId)) return;

        map.set(h.sellerId, {
            sellerId: h.sellerId,
            businessName: h.businessName || "Unknown Store",
            businessType: h.businessType || "",
            address: h.address || "",
            country: h.country || "",
            phone: h.phone || "",
            whatsappLink: h.whatsappLink || "",
        });
    });

    return Array.from(map.values());
}
