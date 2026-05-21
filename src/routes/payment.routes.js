import { Router } from "express";
import { handleCancelSubscription, handleCreateSubscription, handleWebhook } from "../controllers/payment.controllers.js";

const paymentRoutes = Router();

paymentRoutes.route("/create-subscription").post(handleCreateSubscription);
paymentRoutes.route("/webhook").post(handleWebhook);
paymentRoutes.route("/cancel-subscription/:subscriptionId").post(handleCancelSubscription);


export default paymentRoutes;
