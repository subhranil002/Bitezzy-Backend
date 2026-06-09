import redisClient from "../configs/redis.config.js";

const DEFAULT_TTL_SECONDS = 60;

const isRedisReady = () => Boolean(redisClient?.isOpen && redisClient?.isReady);

const safeParse = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const safeStringify = (value) => {
    if (value === undefined) return null;
    if (typeof value === "string") return value;
    return JSON.stringify(value);
};

// Read cache
export const getCache = async (key) => {
    try {
        if (!isRedisReady()) return null;

        const data = await redisClient.get(String(key));
        if (data === null) return null;

        return safeParse(data);
    } catch (error) {
        console.error(`[Redis Get Error] ${key}:`, error.message);
        return null;
    }
};

// Write cache
export const setCache = async (key, value, ttl = DEFAULT_TTL_SECONDS) => {
    try {
        if (!isRedisReady()) return false;

        const serialized = safeStringify(value);
        if (serialized === null) return false;

        await redisClient.set(String(key), serialized, {
            EX: ttl,
        });

        return true;
    } catch (error) {
        console.error(`[Redis Set Error] ${key}:`, error.message);
        return false;
    }
};

// Delete one cache key.
export const deleteCache = async (key) => {
    try {
        if (!isRedisReady()) return false;

        await redisClient.del(String(key));
        return true;
    } catch (error) {
        console.error(`[Redis Delete Error] ${key}:`, error.message);
        return false;
    }
};

// Delete cache keys matching a pattern.
export const deleteCachePattern = async (pattern) => {
    try {
        if (!isRedisReady()) return false;

        const keys = await redisClient.keys(String(pattern));
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        return true;
    } catch (error) {
        console.error(`[Redis Delete Pattern Error] ${pattern}:`, error.message);
        return false;
    }
};
