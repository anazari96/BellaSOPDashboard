import { Redis } from '@upstash/redis'

// Create a singleton instance
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};
let redisClient: Redis | null = null


const getRedisClient = () => {
  if (redisClient) {
    return redisClient
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set',
    )
  }

  redisClient = new Redis({
    url,
    token,
  })

  return redisClient
};

export const redis = globalForRedis.redis ?? getRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
