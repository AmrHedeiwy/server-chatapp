import { redisClient } from '../../lib/redis-client.js';
import { RateLimitError } from '../helpers/ErrorTypes.helper.js';

const ipRouteLimits = {
  '/register': { count: 5, expire: 60 * 5 },
  '/password/forgot': { count: 5, expire: 60 * 10 },
  '/password/reset': { count: 5, expire: 60 * 5 }
};

const emailRouteLimits = {
  '/email/verify/request': { count: 5, expire: 10 * 60 * 1000 },
  '/email/verify': { count: 10, expire: 5 * 60 * 1000 },
  '/password/forgot': { count: 3, expire: 10 * 60 * 1000 },
  '/sign-in': { count: 5, expire: 5 * 60 * 1000 }
};

const userIdRouteLimits = {
  '/edit': { count: 4, expire: 60 * 60 * 1000 },
  '/password/change': { count: 10, expire: 120 * 60 * 1000 }
};

/**
 * IP Rate Limiter Middleware
 *
 * This middleware function limits the number of requests from a specific IP address
 * within a certain time frame for each route.
 *
 * It utilizes a Redis-based counter to track the number of requests made from
 * a particular IP address to a specific route. If the limit is exceeded,
 * it prevents the user from proceeding with the request and returns a rate limit error.
 */
export const ipRateLimiter = async (req, res, next) => {
  // Retrieve the IP address of the client
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Get the URL of the current route
  const route = req.url;

  // Generate a unique identifier based on the route and the user's IP address
  const uniqueIdentifier = route + ip;

  // Increment the counter and set an expiration time for the unique identifier in Redis
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier)
    .expire(uniqueIdentifier, ipRouteLimits[route].expire) // Set an expiration time based on the ip route limit configuration
    .exec();

  // The number of times the a request was made to this route with the IP
  const counter = response[0];

  // If the limit is exceeded, prevent the user from proceeding with the request
  if (counter > ipRouteLimits[route].count)
    return next(new RateLimitError(route));

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
  const email = req.user?.email || req.body.email;

  // Get the URL of the current route
  const route = req.url;

  // Generate a unique identifier based on the route and email address
  const uniqueIdentifier = route + email;

  // Increment the counter and set an expiration time for the unique identifier in Redis
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier)
    .expire(uniqueIdentifier, emailRouteLimits[route].expire) // Set an expiration time based on the email route limit configuration
    .exec();

  // The number of times the a request was made to this route with the specified email
  const counter = response[0];

  // If the limit is exceeded, prevent the user from proceeding with the request
  if (counter > emailRouteLimits[route].count)
    return next(new RateLimitError(route));

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
      const email = req.user?.email || req.body.email;

      // Get the URL of the current route
      const route = req.url;

      // Generate a unique identifier using the route and email
      const uniqueIdentifier = route + email;

      // Delete the counter stored in Redis using the unique identifier
      await redisClient.del(uniqueIdentifier);
    }

    // Call the original end() function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * UserId Rate Limiter Middleware
 *
 * This middleware function limits the number of requests associated with a specific UserID
 * within a certain time frame.
 */
export const userIdRateLimiter = async (req, res, next) => {
  // Retrieve the user ID from the session or request body
  const userId = req.user.userId;

  // Get the URL of the current route
  const route = req.url;

  // Generate a unique identifier based on the route and user ID
  const uniqueIdentifier = route + userId;

  // Increment the counter and set an expiration time for the unique identifier in Redis
  const response = await redisClient
    .multi()
    .incr(uniqueIdentifier)
    .expire(uniqueIdentifier, userIdRouteLimits[route].expire) // Set an expiration time based on the userId route limit configuration
    .exec();

  // The number of times the a request was made to this route with the specified userId
  const counter = response[0];

  // If the limit is exceeded, prevent the user from proceeding with the request
  if (counter > userIdRouteLimits[route].count)
    return next(new RateLimitError(route));

  next();
};
