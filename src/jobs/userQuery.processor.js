import { Worker } from "node:worker_threads";

const WORKER_TIMEOUT_MS = 30_000;

export function userQueryProcessor(payload) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL("../workers/bitebot.worker.js", import.meta.url),
            {
                workerData: payload,
            }
        );

        const timeout = setTimeout(() => {
            worker.terminate();
            reject(new Error("Worker timeout"));
        }, WORKER_TIMEOUT_MS);

        worker.once("message", (message) => {
            clearTimeout(timeout);
            worker.terminate();

            if (message?.error) {
                return reject(new Error(message.error));
            }

            resolve(message);
        });

        worker.once("error", (error) => {
            clearTimeout(timeout);
            worker.terminate();
            reject(error);
        });

        worker.once("exit", (code) => {
            clearTimeout(timeout);

            if (code !== 0) {
                reject(new Error(`Bitebot worker exited with code ${code}`));
            }
        });
    });
}