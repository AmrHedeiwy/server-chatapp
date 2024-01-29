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

import {
  handleAckMessage,
  handleConnect,
  handleDisconnect,
  handleMessage,
  handleSeenMessage,
  initializeUser
} from './api/controllers/socket.controller.js';

// Set the server port
const port = process.env.PORT || 5000;

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
  socket.on('acknowledge_message', (data) => handleAckMessage(socket, data));

  // when a message is seen by a user
  socket.on('seen_message', (data) => handleSeenMessage(socket, data));

  // when a user disconnects
  socket.on('disconnect', () => handleDisconnect(io, socket));
});

/**
 * Synchronize the Sequelize database tables with the models and start the server.
 *
 * @function main
 */
(async function main() {
  await db.sequelize.sync();

  /* db.User.bulkCreate([
    {
      username: 'Emna',
      email: 'amr.hedeiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123',
      isVerified: true
    },
    {
      username: 'amr',
      email: 'amr.hedeiwyss@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'amro',
      email: 'amr.hedeissswyaa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'ahmed',
      email: 'amr.hedaseiwyaaa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alia',
      email: 'amr.haaedsdseiaawy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abdo',
      email: 'amr.heaadsaddasaaeiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abdelrahman',
      email: 'amr.aahedeisway@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'anthony',
      email: 'amr.aahedessasiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'andrew',
      email: 'amr.asa@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alarm',
      email: 'amr.hedeisssaaaaaaaaasswy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'apple',
      email: 'amr.heaadaaaaaesdsadsssiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'amazing',
      email: 'amr.heaaaaaadeiwdasdsdsssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'ackerman',
      email: 'amr.hedaaaaaaeiwaassssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'abodo_3',
      email: 'amr.heaaadeiwasssssassssy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alia_3',
      email: 'amr.hedeissasdswaya@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'alala',
      email: 'amr.hedessdiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'a_moza',
      email: 'amr.hsdsedesiwy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    },
    {
      username: 'a_bent_moza;)',
      email: 'amr.hedeiwsssadsy@gmail.com',
      password: 'amr@AMR123',
      confirmPassword: 'amr@AMR123'
    }
  ]); */

  scheduledTasks();
  server.listen(port, () => {
    console.log(`server running on port: ${port}`);
  });
})();
