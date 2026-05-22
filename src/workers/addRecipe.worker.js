import { workerData } from "node:worker_threads";
import { uploadImageToCloud } from "../utils/index.js";
import Recipe from "../models/recipe.models.js";
import User from "../models/user.models.js";
import { buildEmbeddingText } from "../utils/buildEmbeddingText.js";
import { upsertVector } from "../services/vectorService.js";
import { v7 as uuidv7 } from "uuid";
import mongoose from "mongoose";
import "dotenv/config";
import getNutritionValues from "../utils/getNutritionValues.js";

async function addRecipe(data, files, userId) {
    console.log("📤🖼️ Uploading thumbnail...");
    const thumbnail = await uploadImageToCloud(files.thumbnail, "RECIPES");

    console.log("📤🧾 Uploading step images...");
    const stepImages = await Promise.all(
        files.steps.map((file) => uploadImageToCloud(file, "RECIPES"))
    );

    const steps = data.steps.map((step, i) => ({
        ...step,
        imageUrl: stepImages[i],
    }));
    console.log("🧾✅ Steps processed with images");

    const nutritionValues = await getNutritionValues(data);
    console.log("🍎📊 Nutrition values calculated");

    const uuid = uuidv7();
    await mongoose.connect(process.env.MONGO_URI);
    const recipe = await Recipe.create({
        ...data,
        steps,
        thumbnail,
        chefId: userId,
        nutrition: nutritionValues,
        uuid,
    });
    console.log(`🍲✅ Recipe created (ID: ${recipe._id})`);

    const user = await User.findById(userId);
    const chefName = user?.profile?.name;
    console.log(`👨‍🍳📛 Chef identified: ${chefName}`);

    const text = buildEmbeddingText(recipe, chefName);
    console.log("🧠📄 Embedding text built");

    await upsertVector(uuid, text);

    console.log("🎯✅ Recipe indexing completed");
}

const { data, files, userId } = workerData;

await addRecipe(data, files, userId);
