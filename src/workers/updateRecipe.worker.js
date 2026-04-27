import { workerData } from "node:worker_threads";
import Recipe from "../models/recipe.models.js";
import User from "../models/user.models.js";
import { buildEmbeddingText } from "../utils/buildEmbeddingText.js";
import { getEmbedding } from "../utils/getEmbedding.js";
import { upsertVector } from "../services/vectorService.js";
import mongoose from "mongoose";
import "dotenv/config";

async function updateRecipe(recipe) {
    console.log(`🔄📥 Updating recipe: ${recipe._id}`);

    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findById(recipe.chefId);
    const chefName = user?.profile?.name;
    console.log(`👨‍🍳📛 Chef identified: ${chefName}`);

    const text = buildEmbeddingText(recipe, chefName);
    console.log("🧠📄 Embedding text built");

    await upsertVector(recipe.uuid, text);

    console.log("🎯✅ Recipe indexing updated");
}

const { recipeId } = workerData;

await updateRecipe(recipeId);
