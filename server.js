import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 180000,
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

io.on("connection", (socket) => {
  console.log("a user connected");

  if (socket.recovered) {
    console.log("eita, recuperei");
  }
  socket.on("send message", (msg) => {
    io.emit("send message", msg);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

server.listen(3000, () => console.log("Server is running on port 3000"));
