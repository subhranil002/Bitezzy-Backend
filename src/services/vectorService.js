import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

export const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION_NAME;
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE);
const VECTOR_DISTANCE = process.env.QDRANT_VECTOR_DISTANCE;

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
                distance: VECTOR_DISTANCE,
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
export async function upsertVector(id, text) {
    try {
        if (!id || !text.trim()) {
            throw new Error("Invalid upsert payload");
        }

        await qdrantClient.upsert(COLLECTION, {
            wait: true,
            points: [
                {
                    id,
                    vector: {
                        text,
                        model: process.env.QDRANT_EMBEDDING_MODEL,
                        options: {
                            "openai-api-key": process.env.OPENAI_API_KEY,
                        },
                    },
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

        const res = await qdrantClient.query(COLLECTION, {
            query: {
                text: query,
                model: process.env.QDRANT_EMBEDDING_MODEL,
                options: {
                    "openai-api-key": process.env.OPENAI_API_KEY,
                },
            },
            limit,
        });
        
        console.log(
            `🔍✨ Search completed | Results count: ${res.points?.length}`
        );
        return res.points;
    } catch (error) {
        console.error("❌🔍 Vector search failed:", error);
        throw error;
    }
}
