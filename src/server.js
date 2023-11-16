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
import RedisStore from 'connect-redis';
import { redisClient } from './config/redis-client.js';
import scheduledTasks from './api/helpers/taskSchedule.helper.js';

// Importing the Sequelize instnace
import db from './api/models/index.js';
import cors from 'cors';

// Set the server port
const port = process.env.PORT || 5000;

// Create instances of the Express app, HTTP server, and Socket.io
const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(
  cors({
    credentials: true,
    origin: 'http://localhost:3000',
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the Redis store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'session:'
});

// Configure session middleware
const sessionMiddleware = session({
  secret: 'sec',
  saveUninitialized: false,
  resave: false,
  store: redisStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // Equals 1 day
    secure: false,
    httpOnly: true,
    domain: 'localhost',
    path: '/',
    sameSite: 'strict'
  }
});

// Initialize session storage, Passport middleware, and flash middleware
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Parse request body as JSON and URL-encoded

// Import routes and error handling middleware
import routes from './api/routes/index.route.js';
import errorMiddleware from './api/middlewares/error.middleware.js';

app.use((req, res, next) => {
  next();
});
app.use(routes);
app.use(errorMiddleware);

// Set up Socket.io middleware
const wrapper = (middlware) => (socket, next) =>
  middlware(socket.request, {}, next);
io.use(wrapper(sessionMiddleware));

// code bellow is for testing purposes
// Authenticate Socket.io connections
io.use(async (socket, next) => {
  // @ts-ignore
  if (!socket.request.session.passport?.user) {
    return next(new Error('not auth'));
  }
  next();
});

import { isAuthSocket } from './api/middlewares/auth.middleware.js';
isAuthSocket(io);

// Handle Socket.io connections
io.on('connection', (socket) => {
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
  scheduledTasks();
  server.listen(port, () => {
    console.log(`server running on port: ${port}`);
  });
})();
