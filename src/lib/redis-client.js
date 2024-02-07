import { createClient } from 'redis';

// Initialize the Redis client.
const redisClient = createClient();

// Attempt to connect to the Redis client.
await redisClient.connect().catch(console.error);

export { redisClient };
