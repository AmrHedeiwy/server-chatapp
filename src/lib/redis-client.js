import Redis from 'ioredis';

// Initialize the Redis client.
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT
});

export { redisClient };
