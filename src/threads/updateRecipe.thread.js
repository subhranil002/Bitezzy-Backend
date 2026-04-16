import { workerData } from "node:worker_threads";
import Recipe from "../models/recipe.models";
import User from "../models/user.models";
import { buildEmbeddingText } from "../utils/buildEmbeddingText";
import { getEmbedding } from "../utils/getEmbedding";
import { deleteVector, insertVector } from "../services/vectorService";

async function updateRecipe(recipeId) {
    console.log(`🔄📥 Updating recipe: ${recipeId}`);

    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
        console.log("⚠️❌ Recipe not found");
        throw new Error("Recipe not found");
    }

    const user = await User.findById(recipe.chefId);
    const chefName = user?.profile?.name;

    console.log("🗑️♻️ Removing old vector...");
    await deleteVector(recipeId);

    const text = buildEmbeddingText(recipe, chefName);
    console.log("🧠📄 Rebuilding embedding text");

    const vector = await getEmbedding(text);
    console.log("🧠⚡ New embedding generated");

    await insertVector(recipeId, vector);

    console.log("🔄✅ Recipe vector updated");
}

const { recipeId } = workerData;

await updateRecipe(recipeId);
