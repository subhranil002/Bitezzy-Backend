import { workerData } from "node:worker_threads";
import Recipe from "../models/recipe.models";
import { deleteVector } from "../services/vectorService";

async function deleteRecipe(recipeId) {
    console.log(`🗑️📥 Deleting recipe: ${recipeId}`);

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
        console.log("⚠️❌ Recipe not found");
        throw new Error("Recipe not found");
    }

    console.log("🗑️📥 Deleting recipe...");
    await deleteVector(recipeId);

    console.log(`🗑️📌 Deleted vector for recipe: ${recipeId}`);
}

const { recipeId } = workerData;

await deleteRecipe(recipeId);
