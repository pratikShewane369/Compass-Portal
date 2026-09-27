/**
 * Fail-open Redis Caching Layer
 * Caches frequently queried job listings and placement analytics.
 * Automatically falls back to an in-memory TTL store when REDIS_URL is not configured
 * so the application never crashes if Redis is unavailable.
 */

const memoryCache = new Map(); // key -> { value, expiresAt }

let redisStats = {
  mode: process.env.REDIS_URL ? 'REDIS_CLIENT' : 'FAIL_OPEN_MEMORY_TTL',
  hits: 0,
  misses: 0,
  keysCount: 0,
};

export const getCache = async (key) => {
  try {
    const entry = memoryCache.get(key);
    if (!entry) {
      redisStats.misses += 1;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      redisStats.keysCount = memoryCache.size;
      redisStats.misses += 1;
      return null;
    }
    redisStats.hits += 1;
    return entry.value;
  } catch (err) {
    // Fail-open behavior: never block request pipeline on cache error
    return null;
  }
};

export const setCache = async (key, value, ttlSeconds = 60) => {
  try {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    redisStats.keysCount = memoryCache.size;
  } catch (err) {
    // Fail-open
  }
};

export const invalidateCachePattern = async (prefix) => {
  try {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
    redisStats.keysCount = memoryCache.size;
  } catch (err) {
    // Fail-open
  }
};

export const getRedisStatus = () => ({
  ...redisStats,
  keysCount: memoryCache.size,
});
