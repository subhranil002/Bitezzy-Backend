import redisClient from "../configs/redis.config.js";

// Cache Helpers
export const getCache = async (key) => {
    try {
        if (!redisClient.isOpen) return null;
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`[Redis Get Error] ${key}:`, error.message);
        return null;
    }
};

export const setCache = async (key, data, ttl = 60) => {
    try {
        if (!redisClient.isOpen) return;
        await redisClient.set(key, JSON.stringify(data), {
            NX: true,
            EX: ttl,
        });
    } catch (error) {
        console.error(`[Redis Set Error] ${key}:`, error.message);
    }
};

export const deleteCache = async (pattern) => {
    try {
        if (!redisClient.isOpen) return;
        await redisClient.del(pattern);
    } catch (error) {
        console.error(`[Redis Delete Error] ${pattern}:`, error.message);
    }
};