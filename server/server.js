const http = require("http");
const express = require("express");
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

const MAX_USERS = 2;

io.on("connection", (socket) => {
  socket.on(SOCKET_EVENT.JOIN_ROOM, (roomID) => {
    if (rooms[roomID]) {
      if (rooms[roomID].length >= MAX_USERS) {
        socket.emit("SOCKET_EVENT.ROOM_FULL");
        return;
      }
      rooms[roomID].push(socket.id);
    } else {
      rooms[roomID] = [socket.id];
    }

    socket.room = roomID;

    const otherUser = rooms[roomID].filter((id) => id !== socket.id);

    socket.emit(SOCKET_EVENT.PEER_USER, otherUser);
    logger.log(
      SOCKET_EVENT.PEER_USER,
      "users In This Room, " + roomID + "are " + rooms[roomID] + " users"
    );
    logger.log("socket.room", socket.room);
  });

  socket.on(SOCKET_EVENT.SEND_SIGNAL, (payload) => {
    logger.log(SOCKET_EVENT.SEND_SIGNAL + " called with payload ", payload);

    io.to(payload.peerSocketID).emit(SOCKET_EVENT.USER_JOINED, {
      signal: payload.signal,
      socketID: payload.socketID,
    });
  });

  socket.on(SOCKET_EVENT.RESPONSE_SIGNAL, (payload) => {
    logger.log(SOCKET_EVENT.RESPONSE_SIGNAL + " called with payload ", payload);
    io.to(payload.socketID).emit(SOCKET_EVENT.RESPONSE_SIGNAL_RECEIVED, {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on(SOCKET_EVENT.DISCONNECTED, () => {
    logger.log(
      SOCKET_EVENT.DISCONNECTED + " called for socket.room ",
      socket.room
    );

    if (socket.room) {
      const index = rooms[socket.room].indexOf(socket.id);

      rooms[socket.room].splice(index, 1);

      const remainingUsers = rooms[socket.room];

      io.to(socket.room).emit(SOCKET_EVENT.PEER_USER, remainingUsers);
    }
  });
});

// Start the server
server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);
