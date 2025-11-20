import express from "express";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/error.handler.js";
import cors from "cors";  
import agentRoutes from "./modules/agent/route.js";
import runRoutes from "./modules/run/route.js";
import zkRoutes from "./modules/zk/route.js"; 


dotenv.config();

export class Server {
  private app: express.Application;
  private port: number;
  private apiRouter: express.Router;

  constructor(port: number) {
    this.port = port;
    this.app = express();
    this.apiRouter = express.Router();
  }

  private enableMiddlewares() {
    this.app.use(cors());
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(errorHandler);
  }

  private setUpRoutes() {

    this.apiRouter.use("/agent", agentRoutes);
    this.apiRouter.use("/run", runRoutes);
    this.apiRouter.use("/zk", zkRoutes);
    this.app.use(this.apiRouter);
    this.app.use(errorHandler);
  }

  public startApp() {
    this.enableMiddlewares();
    this.setUpRoutes();
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
    });
  }
}
