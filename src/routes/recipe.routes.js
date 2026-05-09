import { Router } from "express";
import {
    addRecipe,
    getAllRecipes,
    getRecipeById,
    updateRecipe,
    deleteRecipe,
    HandleGetTrendingRecipes,
    HandleGetFreshRecipes,
    HandleGetQuickRecipes,
    HandleGetPremiumRecipes,
    HandleGetRecommendedRecipes,
    handleLikeRecipe,
    handleUnlikeRecipe,
    handleGetSearchRecipe,
} from "../controllers/recipe.controllers.js";
import {
    parseRecipeJsonFields,
    validateRecipe,
    validateRecipeFiles,
} from "../middlewares/recipe.middlewares.js";
import { isAuthorized, isLoggedIn } from "../middlewares/auth.middlewares.js";
import upload from "../middlewares/multer.middlewares.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const recipeRoutes = Router();

recipeRoutes
    .route("/")
    .post(
        isLoggedIn,
        rateLimiter(60, 5),
        isAuthorized("CHEF"),
        upload.fields([
            { name: "thumbnailFile", maxCount: 1 }, // single file
            { name: "stepImages", maxCount: 20 }, // array of files
        ]),
        // validateRecipeFiles,
        parseRecipeJsonFields,
        validateRecipe,
        addRecipe
    )
    .get(rateLimiter(60, 120), getAllRecipes);

recipeRoutes.route("/trending").get(rateLimiter(60, 120), HandleGetTrendingRecipes);
recipeRoutes.route("/fresh").get(rateLimiter(60, 120), HandleGetFreshRecipes);
recipeRoutes.route("/quick").get(rateLimiter(60, 120), HandleGetQuickRecipes);
recipeRoutes.route("/premium").get(rateLimiter(60, 120), HandleGetPremiumRecipes);
recipeRoutes.route("/recommended").get(isLoggedIn, rateLimiter(60, 120), HandleGetRecommendedRecipes);

recipeRoutes.route("/search").get(rateLimiter(60, 120), handleGetSearchRecipe);
recipeRoutes.route("/like/:id").get(isLoggedIn, rateLimiter(60, 30), handleLikeRecipe);
recipeRoutes.route("/unlike/:id").get(isLoggedIn, rateLimiter(60, 30), handleUnlikeRecipe);

recipeRoutes
    .route("/:id")
    .get(isLoggedIn, rateLimiter(60, 120), getRecipeById)
    .put(isLoggedIn, rateLimiter(60, 30), isAuthorized("CHEF"), validateRecipe, updateRecipe)
    .delete(isLoggedIn, rateLimiter(60, 30), isAuthorized("CHEF"), deleteRecipe);

export default recipeRoutes;
