import express from "express";
import { bitebot } from "../controllers/chatbot.controller.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

router.post("/chat", isLoggedIn, rateLimiter(60, 20), bitebot);

export default router;
