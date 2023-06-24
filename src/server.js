import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const port = process.env.PORT || 3000;

// Importing the sequelize instnace
import db from './api/models/index.js';

// Default CORS option
const corsOptions = { origin: process.env.CLIENT_URL };

// Creating an Express app instance, an HTTP server instance, and Socket.io instance
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: corsOptions });

// Parsing request body as json
app.use(express.json());
app.use(cors(corsOptions));

// For testing purposes
io.on('connection', (socket) => {
  console.log(socket.id);
  socket.emit('message', `User with socketID ${socket.id} has joined`);
});

// Importing routes and error handling middleware
import routes from './api/routes/index.route.js';
import errorMiddleware from './api/middlewares/error.middleware.js';

// Mountion routes and error handling middleware on the app
app.use(routes);
app.use(errorMiddleware);

/**
 * Setup the PostgreSQL database and start the server.
 *
 * @function main
 */
async function main() {
  // Synchronizing the databsae tables with the models
  await db.sequelize.sync({ force: true });
  // Starting the server and listening on specifed port
  server.listen(port, () => {
    console.log(`server running on port ${port}`);
  });
}

main();
