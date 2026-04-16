import OpenAI from "openai";
const openai = new OpenAI();

export async function getEmbedding(text) {
    const res = await openai.embeddings.create({
        model: process.env.OPENAI_EMBEDDING_MODEL,
        input: text,
    });
    return res.data[0].embedding;
}
