import { createClient, RedisClientType } from "redis";

export const redisClient : RedisClientType = createClient({
    url : process.env.REDIS_URL 
})