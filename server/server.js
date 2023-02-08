const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const logger = require("./utils/logger");

const rooms = {};

const SOCKET_EVENT = {
  JOIN_ROOM: "join_room",
  ROOM_FULL: "room_full",
  PEER_USER: "peer_user",
  SEND_SIGNAL: "send_signal",
  USER_JOINED: "user_joined",
  RESPONSE_SIGNAL: "response_signal",
  RESPONSE_SIGNAL_RECEIVED: "response_signal_received",
  DISCONNECTED: "disconnect",
};

// Create a variable to store the max number of user in a room
const MAX_USERS = 2;

io.on("connection", (socket) => {
  // Event handler for join room event
  socket.on(SOCKET_EVENT.JOIN_ROOM, (roomID) => {
    // Check if the room already exists
    if (rooms[roomID]) {
      // Check if the room has two users
      if (rooms[roomID].length >= MAX_USERS) {
        socket.emit("SOCKET_EVENT.ROOM_FULL");
        return;
      }
      // Add the user to the room
      rooms[roomID].push(socket.id);
    } else {
      // Create a new room and add the user
      rooms[roomID] = [socket.id];
    }

    // Keep track of the room the user is in
    socket.room = roomID;

    // Get the other user in the room
    const otherUser = rooms[roomID].filter((id) => id !== socket.id);

    // Emit an event to the user with the list of other users in the room
    socket.emit(SOCKET_EVENT.PEER_USER, otherUser);
    logger.log(
      SOCKET_EVENT.PEER_USER,
      "users In This Room, " + roomID + "are " + rooms[roomID] + " users"
    );
    logger.log("socket.room", socket.room);
  });

  // Send a signal to another socket
  socket.on(SOCKET_EVENT.SEND_SIGNAL, (payload) => {
    logger.log(SOCKET_EVENT.SEND_SIGNAL + " called with payload ", payload);

    // Emit an event to the socket with the ID payload.peerSocketID
    io.to(payload.peerSocketID).emit(SOCKET_EVENT.USER_JOINED, {
      signal: payload.signal,
      socketID: payload.socketID,
    });
  });

  // Send a returned signal to the socket that sent the original signal
  socket.on(SOCKET_EVENT.RESPONSE_SIGNAL, (payload) => {
    logger.log(SOCKET_EVENT.RESPONSE_SIGNAL + " called with payload ", payload);
    // Emit an event to the socket with the ID payload.socketID
    io.to(payload.socketID).emit(SOCKET_EVENT.RESPONSE_SIGNAL_RECEIVED, {
      signal: payload.signal,
      id: socket.id,
    });
  });

  // Event handler for "disconnect" event
  socket.on(SOCKET_EVENT.DISCONNECTED, () => {
    logger.log(
      SOCKET_EVENT.DISCONNECTED + " called for socket.room ",
      socket.room
    );

    // Check if the user was in a room
    if (socket.room) {
      // Find the index of the disconnected user in the room
      const index = rooms[socket.room].indexOf(socket.id);

      // Remove the disconnected user from the room
      rooms[socket.room].splice(index, 1);

      // Get the remaining users in the room
      const remainingUsers = rooms[socket.room];

      // Emit an event to the remaining users with the updated list of users in the room
      io.to(socket.room).emit(SOCKET_EVENT.PEER_USER, remainingUsers);
    }
  });
});

// Start the server
server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);
