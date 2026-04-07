import { env } from "../config/env.ts";

export const redisPublisher = new Bun.RedisClient(env.REDIS_URL);
export const redisSubscriber = new Bun.RedisClient(env.REDIS_URL);
