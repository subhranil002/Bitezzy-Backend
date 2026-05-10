import { Router } from "express";
import {
    handleRegister,
    handleLogin,
    handleLogout,
    handleChangeAvatar,
    handleChangePassword,
    handleResetPassword,
    handleForgetPassword,
    handleGetProfile,
    handleGetMySubscriptions,
    handleGetMyRecipes,
    handleUpdateProfile,
    handleGetUserById,
    handleGetUserSubscriptionsById,
    handleGetUserRecipesById,
    handleSubscribeToChef,
    handleUnsubscribeFromChef,
    handleGetFavourites,
    handleContactus,
    handleGuestLogin,
} from "../controllers/user.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";
import upload from "../middlewares/multer.middlewares.js";
import { validateUpdateProfile } from "../middlewares/updateProfile.middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const userRoutes = Router();

// auth routes
userRoutes.route("/register").post(rateLimiter(60, 5), handleRegister);
userRoutes.route("/login").post(rateLimiter(60, 5), handleLogin);
userRoutes.route("/guest-login").post(rateLimiter(60, 5), handleGuestLogin);
userRoutes.route("/logout").get(isLoggedIn, handleLogout);
userRoutes
    .route("/change-avatar")
    .post(isLoggedIn, rateLimiter(60, 5), upload.single("avatar"), handleChangeAvatar);

// password routes
userRoutes.route("/change-password").put(isLoggedIn, rateLimiter(60, 5), handleChangePassword);
userRoutes.route("/reset-password").post(rateLimiter(60, 5), handleResetPassword);
userRoutes.route("/forget-password").post(rateLimiter(60, 5), handleForgetPassword);

// profile routes
userRoutes.route("/me").get(isLoggedIn, rateLimiter(60, 120), handleGetProfile);
userRoutes.route("/subscriptions").get(isLoggedIn, rateLimiter(60, 120), handleGetMySubscriptions);
userRoutes.route("/recipes").get(isLoggedIn, rateLimiter(60, 30), handleGetMyRecipes);
userRoutes
    .route("/update")
    .put(isLoggedIn, rateLimiter(60, 30), validateUpdateProfile, handleUpdateProfile);
userRoutes.route("/favourites").get(isLoggedIn, rateLimiter(60, 30), handleGetFavourites);
userRoutes.route("/:id").get(rateLimiter(60, 30), handleGetUserById);
userRoutes.route("/:id/subscriptions").get(rateLimiter(60, 30), handleGetUserSubscriptionsById);
userRoutes.route("/:id/recipes").get(rateLimiter(60, 30), handleGetUserRecipesById);
userRoutes.route("/contact").post(isLoggedIn, rateLimiter(60, 5), handleContactus);

// subscription routes
userRoutes.route("/subscribe/:chefId").get(isLoggedIn, rateLimiter(60, 15), handleSubscribeToChef);
userRoutes
    .route("/unsubscribe/:chefId")
    .get(isLoggedIn, rateLimiter(60, 15), handleUnsubscribeFromChef);

export default userRoutes;
