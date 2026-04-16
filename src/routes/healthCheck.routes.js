import { Router } from "express";
import {
    handleDbPing,
    handleHealthCheck,
    handleRedisPing,
} from "../controllers/healthCheck.controller.js";

const healthCheckRoutes = Router();

// Health check route
healthCheckRoutes.route("/").get(handleHealthCheck);

// db ping route
healthCheckRoutes.route("/db-ping").get(handleDbPing);

// redis ping route
healthCheckRoutes.route("/redis-ping").get(handleRedisPing);

export default healthCheckRoutes;
