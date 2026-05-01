import { Router } from "express";
import {
    handleCloudinaryPing,
    handleDbPing,
    handleHealthCheck,
    handleQdrantPing,
    handleRedisPing,
} from "../controllers/healthCheck.controller.js";

const healthCheckRoutes = Router();

// Health check route
healthCheckRoutes.route("/").get(handleHealthCheck);

// db ping route
healthCheckRoutes.route("/db-ping").get(handleDbPing);

// redis ping route
healthCheckRoutes.route("/redis-ping").get(handleRedisPing);

// qdrant ping route
healthCheckRoutes.route("/qdrant-ping").get(handleQdrantPing);

// cloudinary ping route
healthCheckRoutes.route("/cloudinary-ping").get(handleCloudinaryPing);

export default healthCheckRoutes;
