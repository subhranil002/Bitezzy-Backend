import { workerData } from "node:worker_threads";
import { deleteVector } from "../services/vectorService.js";

async function deleteRecipe(recipe) {
    await deleteVector(recipe.uuid);
}

const { recipe } = workerData;

await deleteRecipe(recipe);
