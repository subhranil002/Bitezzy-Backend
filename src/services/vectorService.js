import { qdrantClient } from "../configs/qdrant.config.js";
import { getEmbedding } from "../utils/getEmbedding.js";

const COLLECTION = process.env.QDRANT_COLLECTION_NAME;
const VECTOR_SIZE = process.env.QDRANT_VECTOR_DIMENSIONS;

/**
 * Ensure Qdrant collection exists
 */
export async function ensureCollection() {
    try {
        const { exists } = await qdrantClient.collectionExists(COLLECTION);

        if (exists) {
            console.log("📦 Qdrant collection already exists");
            return;
        }

        await qdrantClient.createCollection(COLLECTION, {
            vectors: {
                size: VECTOR_SIZE,
                distance: "Cosine",
            },
        });

        console.log("🆕✅ Qdrant collection created successfully");
    } catch (error) {
        console.error("❌🔥 Error creating collection:", error);
        throw error;
    }
}

/**
 * Upsert vector
 */
export async function insertVector(id, vector) {
    try {
        if (!id || !vector) {
            throw new Error("Invalid upsert payload");
        }

        await qdrantClient.upsert(COLLECTION, {
            wait: true,
            points: [
                {
                    id,
                    vector,
                },
            ],
        });

        console.log(`📌⬆️ Vector upserted successfully (ID: ${id})`);
    } catch (error) {
        console.error("❌⬆️ Vector upsert failed:", error);
        throw error;
    }
}

/**
 * Delete vector
 */
export async function deleteVector(id) {
    try {
        if (!id) throw new Error("ID is required");

        await qdrantClient.delete(COLLECTION, {
            points: [id],
        });

        console.log(`🗑️❌ Vector deleted (ID: ${id})`);
    } catch (error) {
        console.error("❌🗑️ Vector delete failed:", error);
        throw error;
    }
}

/**
 * Search for similar vectors
 */
export async function similaritySearch(query, limit) {
    try {
        if (!query) throw new Error("Query is required");
        if (!limit) throw new Error("Limit is required");

        const vector = await getEmbedding(query);

        const res = await qdrantClient.search(COLLECTION, {
            vector,
            limit,
        });

        console.log(`🔍✨ Search completed | Results: ${res.result.length}`);
        return res.result;
    } catch (error) {
        console.error("❌🔍 Vector search failed:", error);
        throw error;
    }
}
