import "dotenv/config";
import { parentPort, workerData } from "node:worker_threads";
import { bitebotGraph } from "../ai/graphs/bitebot.graph.js";

(async () => {
    try {
        const { messages, toolInUse, language } = workerData;

        // Invoke graph
        const result = await bitebotGraph.invoke({
            messages,
            toolInUse,
            language,
        });

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
