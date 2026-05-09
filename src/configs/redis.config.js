import { createClient } from "redis";

const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
});

redisClient.on("error", (err) => {
    console.error("[Redis Error]:", err.message);
});

redisClient.on("connect", () => {
    console.log("[Redis] Connected successfully");
});

(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("[Redis Connect Error]:", err.message);
    }
})();

export default redisClient;
