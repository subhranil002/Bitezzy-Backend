import { Worker } from "node:worker_threads";

export function userQueryProcessor(payload) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(
            new URL("../workers/chatbot.worker.js", import.meta.url),
            {
                workerData: payload,
            }
        );

        worker.once("message", (message) => {
            if (message?.error) {
                reject(new Error(message.error));
                return;
            }

            resolve(message);
        });
        worker.once("error", reject);
        worker.once("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Recipe worker exited with code ${code}`));
            }
        });
    });
}
