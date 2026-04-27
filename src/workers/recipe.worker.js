import { Worker as WorkerThread } from "node:worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runWorker(job) {
    const { type, recipe, data, files, userId } = job.data;

    switch (type) {
        case "ADD":
            await new Promise((resolve, reject) => {
                const worker = new WorkerThread(
                    path.join(__dirname, "addRecipe.worker.js"),
                    {
                        workerData: { data, files, userId },
                    }
                );

                worker.on("error", reject);
                worker.on("exit", (code) => {
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
                const worker = new WorkerThread(
                    path.join(__dirname, "updateRecipe.worker.js"),
                    { workerData: { recipe } }
                );

                worker.on("error", reject);
                worker.on("exit", (code) => {
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
                const worker = new WorkerThread(
                    path.join(__dirname, "deleteRecipe.worker.js"),
                    { workerData: { recipe } }
                );

                worker.on("error", reject);
                worker.on("exit", (code) => {
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
            throw new Error(`❌ Unknown job type: ${type}`);
    }
}
