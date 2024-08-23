import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function main() {
  //open the database file
  const db = await open({
    filename: "chat.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
    );  
  `);

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {
      maxDisconnectionDuration: 180000,
    },
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  io.on("connection", async (socket) => {
    io.emit("send message", "* connected *");
    console.log("a user connected");

    if (!socket.recovered) {
      // if the connection state recovery was not sucessful
      try {
        await db.each(
          "SELECT id, content FROM messages WHERE id > ?",
          [socket.handshake.auth.serverOffset || 0],
          (err, row) => {
            socket.emit("send message", row.content, row.id);
          }
        );
      } catch (error) {
        console.log("Error: ", error);
      }
    }

    socket.on("send message", async (msg) => {
      let result;
      try {
        result = await db.run("INSERT INTO messages (content) VALUES (?)", msg);
      } catch (error) {
        console.log("Error: ", error);
      }
      io.emit("send message", msg, result.lastID);
    });

    socket.on("disconnect", () => {
      io.emit("send message", "* disconnected *");
      console.log("user disconnected");
    });
  });

  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
  });

  server.listen(3000, () => console.log("Server is running on port 3000"));
}

main();
