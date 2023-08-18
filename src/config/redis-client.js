import { createClient } from 'redis';

// Initialize the Redis client.
const redisClient = createClient();

// Attempt to connect to the redis client.
redisClient.connect().catch(console.error);

export { redisClient };
