const path = require("path");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

app.use(express.static(path.join(__dirname, "client")));

app.use(function (request, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  if ("OPTIONS" === request.method) {
    res.send(200);
  } else {
    next();
  }
});
const syncOnJoin = async ({ socket, roomId }) => {
  const usersId = await io.in(roomId).allSockets();
  const uniqueUsersId = await [...usersId];
  setTimeout(() => console.log(uniqueUsersId), 500);
  if (!uniqueUsersId) return;
  socket.to(uniqueUsersId[0]).emit("serverEventsHandler", {
    type: "joinAskData",
    currentData: { newSocketId: socket.id },
  });
};

io.on("connection", (socket) => {
  console.log("User online with id: ", socket.id);

  socket.on("roomHandler", ({ roomId, joinSync }) => {
    if (joinSync) {
      syncOnJoin({ socket, roomId });
      console.log(socket.id, " Has joined the room: ", roomId);
      socket.join(roomId);
    } else {
      console.log(socket.id, " Has created the room: ", roomId);
      socket.join(roomId);
    }
  });

  socket.on("serverEventsHandler", ({ type, event, roomId, currentData }) => {
    if (type === "playerEvent") {
      socket.to(roomId).emit("serverEventsHandler", {
        type,
        event,
        currentData,
      });
    }
    if (type === "loadVideo") {
      console.log("video selectod on room: ", roomId);
      socket.to(roomId).emit("serverEventsHandler", {
        type,
        currentData,
      });
    }
    if (type === "sendJoinedData") {
      socket.to(currentData.newSocketId).emit("serverEventsHandler", {
        currentData,
        type: "recieveCurrentData",
      });
    }
  });

  socket.on("chatHandler", ({ roomId, newMessage, userName }) => {
    socket.to(roomId).emit("chatHandler", { newMessage, userName });
    console.log(newMessage, userName, roomId);
  });

  socket.on("disconnect", (reason) => {
    console.log("user offline with id: ", socket.id, " ", reason);
  });
});

const port = process.env.PORT || 4000;
http.listen(port, () => {
  console.log("listening on: " + port);
});
