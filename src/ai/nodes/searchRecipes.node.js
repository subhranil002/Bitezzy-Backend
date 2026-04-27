import {
    ensureCollection,
    similaritySearch,
} from "../../services/vectorService.js";
import mongoose from "mongoose";
import "dotenv/config";
import Recipe from "../../models/recipe.models.js";
import { recipesSchema } from "../schemas/state.schema.js";

export async function searchRecipesNode(state) {
    await ensureCollection();
    const res = await similaritySearch(
        state.translatedQuery,
        state.requestedCount
    );

    const uuids = res.map((item) => item.id);
    if (uuids.length === 0) {
        return {
            recipes: [],
        };
    }

    await mongoose.connect(process.env.MONGO_URI);
    const recipes = await Recipe.find({
        uuid: {
            $in: uuids,
        },
    });
    if (recipes.length === 0) {
        return {
            recipes: [],
        };
    }

    return {
        recipes: recipesSchema.parse(recipes),
    };
}
