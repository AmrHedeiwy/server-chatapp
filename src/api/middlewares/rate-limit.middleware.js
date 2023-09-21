import { redisClient } from '../../config/redis-client.js';
import { RateLimitError } from '../helpers/ErrorTypes.helper.js';

const ipRouteLimits = {
  '/register': { count: 5, expire: 60 * 5 },
  '/forgot-password': { count: 5, expire: 60 * 10 },
  '/reset-password': { count: 5, expire: 60 * 5 }
};

const emailRouteLimits = {
  '/request-email-verification': { count: 3, expire: 60 * 10 },
  '/verify-email': { count: 4, expire: 60 * 5 },
  '/forgot-password': { count: 3, expire: 60 * 10 },
  '/sign-in': { count: 5, expire: 60 * 5 },
  '/edit': { count: 4, expire: 60 * 60 }
};

/**
 * IP Rate Limiter Middleware
 *
 * This middleware function limits the number of requests from a specific IP address
 * within a certain time frame.
 */
export const ipRateLimiter = async (req, res, next) => {
  // Retrieve the IP address of the client
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Get the current route being accessed
  const route = req.url;

  // Generate a unique identifier based on the route and IP address
  const uniqueIdentifier = route + ip;

  // Execute multiple Redis commands atomically
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier) // Increment the counter for the unique identifier
    .expire(uniqueIdentifier, ipRouteLimits[route].expire) // Set an expiration time based on the ip route limit configuration
    .exec();

  // Retrieve the counter value from the Redis response
  const counter = response[0];

  // If the limit is exceeded, invoke the next middleware with a RateLimitError
  if (counter > ipRouteLimits[route].count)
    return next(new RateLimitError(route));

  // If the limit is not exceeded, proceed to the next middleware
  next();
};

/**
 * Email Rate Limiter Middleware
 *
 * This middleware function limits the number of requests associated with a specific email address
 * within a certain time frame.
 */
export const emailRateLimiter = async (req, res, next) => {
  // Retrieve the email address from the session or request body
  const email =
    req.session.needsVerification?.Email || req.user?.Email || req.body.Email;

  // Get the current route being accessed
  const route = req.url;

  // Generate a unique identifier based on the route and email address
  const uniqueIdentifier = route + email;

  // Execute multiple Redis commands atomically
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier) // Increment the counter for the unique identifier
    .expire(uniqueIdentifier, emailRouteLimits[route].expire) // Set an expiration time based on the email route limit configuration
    .exec();

  // Retrieve the counter value from the Redis response
  const counter = response[0];

  // If the limit is exceeded, invoke the next middleware with a RateLimitError
  if (counter > emailRouteLimits[route].count)
    return next(new RateLimitError(route));

  // If the limit is not exceeded, proceed to the next middleware
  next();
};

/**
 * emailSkipSucessRequest Middleware
 *
 * This middleware is responsible for overriding the `res.end()` function to track successful email skips and bypass email rate limiters.
 * It checks the response status and, if it is less than 400, it retrieves the email from the session or request body
 * and the route from the request URL. It then generates a unique identifier using the route and email, and decrements
 * a counter stored in Redis using the unique identifier.
 */
export const emailSkipSucessRequest = async (req, res, next) => {
  // Store the original end() function
  const originalEnd = res.end;

  // Override the end() function
  res.end = async function (chunk, encoding) {
    // Check if the response status is less than 400
    if (this.statusCode < 400) {
      // Retrieve the email from the session or request body
      const email =
        req.session.needsVerification?.Email ||
        req?.user.Email ||
        req.body.Email;

      // Get the route from the request URL
      const route = req.url;

      // Generate a unique identifier using the route and email
      const uniqueIdentifier = route + email;

      // Decrement the counter stored in Redis using the unique identifier
      await redisClient.multi().decr(uniqueIdentifier).exec();
    }

    // Call the original end() function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * UserID Rate Limiter Middleware
 *
 * This middleware function limits the number of requests associated with a specific UserID
 * within a certain time frame.
 */
export const userIdRateLimiter = async (req, res, next) => {
  // Retrieve the email address from the session or request body
  const userId = req.user.UserID;

  // Get the current route being accessed
  const route = req.url;

  // Generate a unique identifier based on the route and email address
  const uniqueIdentifier = route + userId;

  // Execute multiple Redis commands atomically
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier) // Increment the counter for the unique identifier
    .expire(uniqueIdentifier, emailRouteLimits[route].expire) // Set an expiration time based on the email route limit configuration
    .exec();

  // Retrieve the counter value from the Redis response
  const counter = response[0];

  // If the limit is exceeded, invoke the next middleware with a RateLimitError
  if (counter > emailRouteLimits[route].count)
    return next(new RateLimitError(route));

  // If the limit is not exceeded, proceed to the next middleware
  next();
};
