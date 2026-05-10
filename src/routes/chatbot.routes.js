import express from "express";
import { recipeChat } from "../controllers/chatbot.controller.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

router.post("/chat", isLoggedIn, rateLimiter(60, 10), recipeChat);

export default router;
