import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
});

export const recipeQueue = new Queue("recipe-queue", {
    connection,
});