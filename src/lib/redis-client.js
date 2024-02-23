import Redis from 'ioredis';
import { createClient } from 'redis';

// Initialize the Redis client.
const redis = new Redis({
  host: process.env.REDIS_HOST,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT
});

// Attempt to connect to the Redis client.

const redisClient = redis;

// await redisClient.connect().catch(console.error);

export { redisClient };
