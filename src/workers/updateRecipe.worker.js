import { workerData } from "node:worker_threads";
import User from "../models/user.models.js";
import { buildEmbeddingText } from "../utils/buildEmbeddingText.js";
import { upsertVector } from "../services/vectorService.js";
import mongoose from "mongoose";
import "dotenv/config";
import getNutritionValues from "../utils/getNutritionValues.js";
import Recipe from "../models/recipe.models.js";

async function updateRecipe(recipe) {
    console.log(`🔄📥 Updating recipe: ${recipe._id}`);

    const nutritionValues = await getNutritionValues(recipe);
    console.log("🍎📊 Nutrition values calculated");

    await mongoose.connect(process.env.MONGO_URI);
    const updatedRecipe = await Recipe.findByIdAndUpdate(
        recipe._id,
        {
            nutrition: nutritionValues,
        },
        { new: true }
    );
    console.log(`🍲✅ Recipe nutrition updated (ID: ${updatedRecipe._id})`);

    const user = await User.findById(updatedRecipe.chefId);
    const chefName = user?.profile?.name;
    console.log(`👨‍🍳📛 Chef identified: ${chefName}`);

    const text = buildEmbeddingText(updatedRecipe, chefName);
    console.log("🧠📄 Embedding text built");

    await upsertVector(updatedRecipe.uuid, text);

    console.log("🎯✅ Recipe indexing updated");
}

const { recipeId } = workerData;

await updateRecipe(recipeId);
