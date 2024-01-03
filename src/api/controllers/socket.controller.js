import { redisClient } from '../../config/redis-client.js';

/**
 * 1. Sets the user property on the socket object to the user ID stored in the session.
 * 2. Joins the socket to a room with the user ID.
 */
export const initializeUser = async (socket, next) => {
  socket.user = socket.request.session.passport?.user;
  socket.join(socket.user.UserID);
  next();
};

/**
 * 1. Retrieves the rooms associated with the user from the Redis database.
 * 2. Filters the rooms to find the online rooms (rooms with active sockets).
 * 3. Emits a 'connected' event to the user's socket with the online rooms to inform
 * about the users online.
 * 5. If online rooms exist, emits a 'connected' event to the online rooms with the user's ID to notify
 * the other users that the user is online.
 */
export const handleConnect = async (io, socket) => {
  const rooms = JSON.parse(
    await redisClient.get(`user_data:${socket.user.UserID}`)
  ).Rooms;

  const onlineRooms = rooms.filter((room) =>
    io.sockets.adapter.rooms.has(room)
  );

  io.to(socket.user.UserID).emit('connected', true, onlineRooms);

  if (onlineRooms) {
    io.to(onlineRooms).emit('connected', true, [socket.user.UserID]);
  }
};

/**
 * 1. Retrieves the rooms associated with the user from the Redis database.
 * 2. Filters the rooms to find the online rooms (rooms with active sockets).
 * 3. Emits a 'connected' event to the online rooms with the user's ID to notify
 * the other users that the user is offline.
 */
export const handleDisconnect = async (io, socket) => {
  const rooms = JSON.parse(
    await redisClient.get(`user_data:${socket.user.UserID}`)
  ).Rooms;

  const onlineRooms = rooms.filter((room) =>
    io.sockets.adapter.rooms.has(room)
  );

  if (onlineRooms) {
    io.to(onlineRooms).emit('connected', false, [socket.user.UserID]);
  }
};

export default { handleConnect };
