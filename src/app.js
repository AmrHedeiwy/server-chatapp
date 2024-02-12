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
import { redisClient } from './lib/redis-client.js';
import cors from 'cors';

import {
  handleConnect,
  handleDeleteMessage,
  handleDisconnect,
  handleMessage,
  handleMessageEdit,
  handleMessageStatus,
  initializeUser
} from './api/controllers/socket.controller.js';

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders:
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
};

// Create instances of the Express app, HTTP server, and Socket.io
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));

// Parse request body as JSON and URL-encoded
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

// Import routes and error handling middleware
import routes from './api/routes/index.route.js';
import errorMiddleware from './api/middlewares/error.middleware.js';
import { isAuthSocket } from './api/middlewares/auth.middleware.js';

app.use(routes);
app.use(errorMiddleware);

// Define a wrapper function to convert middleware to socketio middleware
const wrapper = (middlware) => (socket, next) =>
  middlware(socket.request, {}, next);
io.use(wrapper(sessionMiddleware));

io.use(isAuthSocket);
io.use(initializeUser);

io.on('connection', async (socket) => {
  // when a user connects
  handleConnect(io, socket);

  // when a message is sent
  socket.on('sendMessage', (data, cb) => handleMessage(socket, data, cb));

  // when a message is delivered to a user
  socket.on('update_status', (data) => handleMessageStatus(socket, data));

  socket.on('edit_message', (data) => handleMessageEdit(socket, data));

  socket.on('delete_message', (data) => handleDeleteMessage(socket, data));

  // when a user disconnects
  socket.on('disconnect', () => handleDisconnect(io, socket));
});

export { server, io };
