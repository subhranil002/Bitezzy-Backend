import { Worker } from "bullmq";
import { ensureCollection } from "../services/vectorService.js";
import { connection } from "../configs/queue.config.js";
import { runThread } from "../threads/index.js";

const bullMQWorker = new Worker(
    "recipe-queue",
    async (job) => {
        const { type } = job.data;

        console.log(`🚀📥 Job received | ID: ${job.id} | Type: ${type}`);

        await ensureCollection();

        await runThread(job);
    },
    { connection }
);

/**
 * Listen for events
 */
bullMQWorker.on("completed", (job) => {
    console.log(`✅🎉 Job completed successfully: ${job.id}`);
});

bullMQWorker.on("failed", (job, err) => {
    console.error(`❌💥 Job failed | ID: ${job?.id}`, err);
});
