import { Worker as WorkerThread } from "node:worker_threads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKER_TIMEOUT_MS = 600_000; // 10 minutes

function runWorkerThread(workerPath, workerData) {
    return new Promise((resolve, reject) => {
        const worker = new WorkerThread(workerPath, { workerData });

        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error("Worker timeout"));
        }, WORKER_TIMEOUT_MS);

        worker.once("error", (error) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(error);
        });

        worker.once("exit", (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

export async function runWorker(job) {
    const { type, recipe, data, files, userId } = job.data;

    switch (type) {
        case "ADD":
            await runWorkerThread(path.join(__dirname, "addRecipe.worker.js"), { data, files, userId });
            break;

        case "UPDATE":
            await runWorkerThread(path.join(__dirname, "updateRecipe.worker.js"), { recipe });
            break;

        case "DELETE":
            await runWorkerThread(path.join(__dirname, "deleteRecipe.worker.js"), { recipe });
            break;

        default:
            throw new Error(`❌ Unknown job type: ${type}`);
    }
}
