import { workerData } from "node:worker_threads";
import { uploadImageToCloud } from "../utils";
import Recipe from "../models/recipe.models";
import User from "../models/user.models";
import { buildEmbeddingText } from "../utils/buildEmbeddingText";
import { getEmbedding } from "../utils/getEmbedding";
import { insertVector } from "../services/vectorService";

async function addRecipe(data, files, userId) {
    console.log("📤🖼️ Uploading thumbnail...");

    const thumbnail = await uploadImageToCloud(files.thumbnail);

    console.log("📤🧾 Uploading step images...");

    const stepImages = await Promise.all(
        files.steps.map((file) => uploadImageToCloud(file))
    );

    const steps = data.steps.map((step, i) => ({
        ...step,
        imageUrl: stepImages[i],
    }));

    console.log("🧾✅ Steps processed with images");

    const recipe = await Recipe.create({
        ...data,
        steps,
        thumbnail,
        chefId: userId,
    });

    console.log(`🍲✅ Recipe created (ID: ${recipe._id})`);

    const user = await User.findById(userId);
    const chefName = user?.profile?.name;

    console.log(`👨‍🍳📛 Chef identified: ${chefName}`);

    const text = buildEmbeddingText(recipe, chefName);
    console.log("🧠📄 Embedding text built");

    const vector = await getEmbedding(text);
    console.log("🧠⚡ Embedding generated");

    await insertVector(recipe._id.toString(), vector);

    console.log("🎯✅ Recipe indexing completed");
}

const { data, files, userId } = workerData;

await addRecipe(data, files, userId);
