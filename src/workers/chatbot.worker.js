import "dotenv/config";
import { parentPort, workerData } from "node:worker_threads";
import { recipeGraph } from "../ai/graphs/recipe.graph.js";

(async () => {
    try {
        const { userInput, toolInUse } = workerData;

        // Invoke graph
        const result = await recipeGraph.invoke(
            { userInput, toolInUse },
            { configurable: { thread_id: "1" } }
        );

        parentPort?.postMessage({
            reply: result.reply || "",
            recipes: result.recipes || [],
        });
    } catch (error) {
        parentPort?.postMessage({
            error: error instanceof Error ? error.message : String(error),
        });
    }
})();
