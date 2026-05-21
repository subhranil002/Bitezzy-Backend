import redisClient from "../configs/redis.config.js";

export const rateLimiter = (seconds = 60, max = 5) => async (req, res, next) => {
    try {
        // Fail-open: if Redis isn't connected, bypass rate limiting
        if (!redisClient.isOpen) {
            console.error("[Rate Limiter] Redis client is not open. Bypassing rate limit.");
            return next();
        }

        const ip = req.ip;
        const key = `rate:${ip}:${req.baseUrl}${req.path}`;
        const windowMs = seconds * 1000; // 60 seconds

        // Atomicity (No Race Conditions): Use MULTI/EXEC pipeline in Redis
        // We atomically create the key with a TTL if it doesn't exist, then increment.
        const multi = redisClient.multi();

        // 1. SET NX PX: Sets the value to 0 and adds expiration ONLY if it does not exist
        multi.set(key, 0, { NX: true, PX: windowMs });
        // 2. INCR: Increments the value (from 0 to 1 if just created, or current + 1)
        multi.incr(key);

        // Execute the pipeline
        const results = await multi.exec();

        // results[1] corresponds to the result of the INCR command
        const currentRequests = results[1];

        // Check if limit exceeded
        if (currentRequests > max) {
            return res.status(429).json({ error: "Too many requests, please try again later." });
        }
        next();

    } catch (error) {
        console.log("Some error occured: ", error);
        
        error instanceof ApiError
            ? next(error)
            : next(
                new ApiError(500, "Something went wrong during ratelimiting")
            );
    }
};
