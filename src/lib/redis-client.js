import Redis from 'ioredis';
import { createClient } from 'redis';

// Initialize the Redis client.
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT
});

// await redisClient.connect().catch(console.error);

export { redisClient };
