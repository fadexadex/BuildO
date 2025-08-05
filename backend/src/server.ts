import { Server } from "./app.controller.js";

const port: number = Number(process.env.PORT) || 3001;

const server = new Server(port);
server.startApp();