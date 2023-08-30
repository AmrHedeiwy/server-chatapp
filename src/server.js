/**
 * This module sets up an Express app instance, an HTTP server instance, and a Socket.io instance.
 * It also connects to a Redis instance and initializes session storage, and mounts routes and error handling middleware on the app.
 *
 * @module server.js
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import session from 'express-session';
import { passport } from './api/services/auth/index.service.js';
import flash from 'connect-flash';
import RedisStore from 'connect-redis';
import { redisClient } from './config/redis-client.js';
import path, { dirname } from 'path';

// Importing the Sequelize instnace.
import db from './api/models/index.js';

// Set the server port.
const port = process.env.PORT || 3000;

// Set the public directory path.
const publicPath = path
  .join(dirname(import.meta.url), '../public')
  .replace('file:\\', '');

// Create instances of the Express app, HTTP server, and Socket.io.
const app = express();
const server = createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(publicPath));

// Initialize the Redis store.
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'session:',
  ttl: 6000 // Equals 1 day
});

// Configure session middleware.
const sessionMiddleware = session({
  secret: 'sec',
  saveUninitialized: false,
  resave: false,
  store: redisStore,
  cookie: {
    maxAge: 1000 * 60 * 24 * 24, // Equals 1 day
    secure: false,
    httpOnly: true
  }
});

// Initialize session storage, Passport middleware, and flash middleware.
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(flash());

// Parse request body as JSON and URL-encoded.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes and error handling middleware.
import routes from './api/routes/index.route.js';
import errorMiddleware from './api/middlewares/error.middleware.js';

const excludePassportSession = (req, res, next) => {
  const url = req.url;

  if (
    url.endsWith('/sign-in') ||
    url.endsWith('/chat') ||
    url.endsWith('/profile')
  ) {
    // Exclude the register route from Passport session handling
    return passport.session()(req, res, next);
  }

  // For other routes, continue with Passport session handling
  return next();
};

// Apply the middleware to the routes
app.use(excludePassportSession);

// Mount routes and error handling middleware on the app.
app.use(routes);
app.use(errorMiddleware);

// Set up Socket.io middleware.
const wrapper = (middlware) => (socket, next) =>
  middlware(socket.request, {}, next);
io.use(wrapper(sessionMiddleware));

// code bellow is for testing purposes
// Authenticate Socket.io connections.
io.use(async (socket, next) => {
  if (!socket.request.session.passport?.user) {
    return next(new Error('not auth'));
  }
  next();
});

// Handle Socket.io connections.
io.on('connection', (socket) => {
  // Handling flash messages
  const flashMessages = socket.request.session.flash;
  if (flashMessages) {
    Object.entries(flashMessages).forEach(([type, message]) => {
      socket.emit('flash', { type, message });
    });
    delete socket.request.session.flash;
    socket.request.session.save();
  }
  // console.log(socket.request);
  // socket.emit('message', `User with socketID ${socket.id} has joined`);
});
// code above is for testing purposes

/**
 * Synchronize the Sequelize database tables with the models and start the server.
 *
 * @function main
 */
(async function main() {
  await db.sequelize.sync();
  server.listen(port, () => {
    console.log(`server running on port: ${port}`);
  });
})();
