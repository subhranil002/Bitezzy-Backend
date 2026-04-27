import { Worker as BullMQWorker } from "bullmq";
import { ensureCollection } from "../services/vectorService.js";
import { connection } from "../configs/queue.config.js";
import { runWorker } from "../workers/recipe.worker.js";

const recipeQueueWorker = new BullMQWorker(
    "recipe-queue",
    async (job) => {
        const { type: jobType } = job.data;

        console.log(`🚀📥 Job received | ID: ${job.id} | Type: ${jobType}`);

        await ensureCollection();

        await runWorker(job);
    },
    { connection }
);

/**
 * Listen for events
 */
recipeQueueWorker.on("completed", (job) => {
    console.log(`✅🎉 Job completed successfully: ${job.id}`);
});

recipeQueueWorker.on("failed", (job, error) => {
    console.error(`❌💥 Job failed | ID: ${job?.id}`, error);
});
