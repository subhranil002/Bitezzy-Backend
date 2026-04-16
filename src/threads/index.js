import { Worker as WorkerThread } from "node:worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runThread(job) {
    const { type, recipeId, data, files, userId } = job.data;

    switch (type) {
        case "ADD":
            await new Promise((resolve, reject) => {
                const thread = new WorkerThread(
                    path.join(__dirname, "addRecipe.thread.js"),
                    {
                        workerData: { data, files, userId },
                    }
                );

                thread.on("error", reject);
                thread.on("exit", (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(
                            new Error(`Worker stopped with exit code ${code}`)
                        );
                    }
                });
            });
            break;

        case "UPDATE":
            await new Promise((resolve, reject) => {
                const thread = new WorkerThread(
                    path.join(__dirname, "updateRecipe.thread.js"),
                    { workerData: { recipeId } }
                );

                thread.on("error", reject);
                thread.on("exit", (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(
                            new Error(`Worker stopped with exit code ${code}`)
                        );
                    }
                });
            });
            break;

        case "DELETE":
            await new Promise((resolve, reject) => {
                const thread = new WorkerThread(
                    path.join(__dirname, "deleteRecipe.thread.js"),
                    { workerData: { recipeId } }
                );

                thread.on("error", reject);
                thread.on("exit", (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(
                            new Error(`Worker stopped with exit code ${code}`)
                        );
                    }
                });
            });
            break;

        default:
            console.log(`⚠️❓ Unknown job type: ${type}`);
            throw new Error(`Unknown job type: ${type}`);
    }
}
