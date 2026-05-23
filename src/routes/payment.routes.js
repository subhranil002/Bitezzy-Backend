import { Router } from "express";
import {
    handleCancelSubscription,
    handleCreatePlan,
    handleCreateSubscription,
    handleWebhook,
} from "../controllers/payment.controllers.js";
import { isAuthorized, isLoggedIn } from "../middlewares/auth.middlewares.js";

const paymentRoutes = Router();

paymentRoutes
    .route("/create-plan")
    .post(isLoggedIn, isAuthorized("CHEF", "ADMIN"), handleCreatePlan);

paymentRoutes
    .route("/create-subscription")
    .post(isLoggedIn, isAuthorized("USER"), handleCreateSubscription);

paymentRoutes.route("/webhook").post(handleWebhook);

paymentRoutes
    .route("/cancel-subscription/:subscriptionId")
    .post(isloggedIn, isAuthorized("USER"), handleCancelSubscription);

export default paymentRoutes;
