import Recipe from "../models/recipe.models.js";
import { ApiResponse, ApiError } from "../utils/index.js";
import User from "../models/user.models.js";
import { similaritySearch } from "../services/vectorService.js";
import { recipeQueue } from "../configs/queue.config.js";
import { uuid } from "zod/v4";
import { getCache, setCache, deleteCache } from "../utils/redisUtils.js";

// CREATE Recipe
const addRecipe = async (req, res, next) => {
    try {
        /** ============================
         * 1️⃣ Extract files
         * ============================ */
        const thumbnailFile = req.files?.thumbnailFile?.[0];
        const stepImagesFiles = req.files?.stepImages || [];

        /** ============================
         * 2️⃣ Validate images
         * ============================ */
        // Thumbnail validation
        if (!thumbnailFile) {
            throw new ApiError(400, "Thumbnail image is required");
        }
        // Steps images validation
        if (stepImagesFiles.length === 0) {
            throw new ApiError(400, "Step images are required");
        }
        // Match step count with image count
        if (stepImagesFiles.length !== req.body.steps.length) {
            throw new ApiError(
                400,
                `Mismatch: Expected ${steps.length} step images, received ${stepImagesFiles.length}`
            );
        }

        /**
         * ============================
         * 3️⃣ Add recipe to queue
         * ============================
         */
        await recipeQueue.add(
            "recipe-queue",
            {
                type: "ADD",
                data: req.body,
                files: {
                    thumbnail: thumbnailFile.path,
                    steps: stepImagesFiles.map((f) => f.path),
                },
                userId: req.user._id.toString(),
            },
            { removeOnComplete: true, removeOnFail: true }
        );

        /**
         * ============================
         * 4️⃣ Return immediately
         * ============================
         */
        return res
            .status(202)
            .json(
                new ApiResponse(
                    202,
                    "Recipe is being processed and will be available soon"
                )
            );
    } catch (err) {
        next(err);
    }
};

// READ All Recipes (Not in use)
const getAllRecipes = async (req, res, next) => {
    try {
        const startIndex = parseInt(req.query.startIndex) || 0;
        const limit = parseInt(req.query.limit) || 8;

        // Multiple filter support
        const filters = {
            trending: req.query.trending === "true",
            fresh: req.query.fresh === "true",
            quick: req.query.quick === "true",
            recommended: req.query.recommended === "true",
            premium: req.query.premium === "true",
            cuisine: req.query.cuisine,
            dietaryPreference: req.query.dietaryPreference
                ? req.query.dietaryPreference
                      .split(",")
                      .filter((pref) => pref.trim() !== "")
                      .map((pref) => pref.trim().toLowerCase())
                : [],
            minPrice: req.query.minPrice
                ? parseFloat(req.query.minPrice)
                : null,
            maxPrice: req.query.maxPrice
                ? parseFloat(req.query.maxPrice)
                : null,
            rating: req.query.rating ? parseFloat(req.query.rating) : null, // single rating value
        };

        // Pagination validation
        if (startIndex < 0 || limit < 1) {
            return next(new ApiError(400, "Invalid pagination parameters"));
        }

        let pipeline = [];
        let matchStage = {};

        // Premium recipes only
        if (filters.premium) {
            matchStage.isPremium = true;
        }

        // Recommended filter with soft matching
        if (filters.recommended) {
            if (filters.cuisine)
                matchStage.cuisine = {
                    $regex: new RegExp(filters.cuisine, "i"),
                };

            if (filters.dietaryPreference.length > 0)
                matchStage.dietaryLabels = {
                    $in: filters.dietaryPreference,
                };
        }

        // Cuisine filter
        if (filters.cuisine && !filters.recommended) {
            matchStage.cuisine = filters.cuisine;
        }

        // Dietary Preference filter
        if (filters.dietaryPreference.length > 0 && !filters.recommended) {
            matchStage.dietaryLabels = { $in: filters.dietaryPreference };
        }

        // Trending filter (last 30 days)
        if (filters.trending) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            matchStage.createdAt = { $lte: thirtyDaysAgo };
        }

        // QUICK RECIPES: Auto filter for fast recipes (no frontend input)
        if (filters.quick) {
            matchStage.totalCookingTime = { $lte: 30 }; // recipes ≤ 30 mins
        }

        // Add match stage if conditions exist
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // Add all calculated fields upfront (industry standard)
        pipeline.push({
            $addFields: {
                // Total ingredient price
                totalPrice: {
                    $sum: {
                        $map: {
                            input: { $ifNull: ["$ingredients", []] },
                            as: "ingredient",
                            in: { $ifNull: ["$$ingredient.marketPrice", 0] },
                        },
                    },
                },
                // Average rating (0 if no reviews)
                avgRating: {
                    $ifNull: [{ $avg: "$reviews.rating" }, 0],
                },
                // Like count (needed for trending/premium/recommended sorting)
                likeCountNum: {
                    $size: { $ifNull: ["$likeCount", []] },
                },
            },
        });

        // Filter by price range if provided
        if (filters.minPrice !== null || filters.maxPrice !== null) {
            let priceMatchStage = {};

            if (filters.minPrice !== null && filters.maxPrice !== null) {
                // Both min and max provided
                priceMatchStage.totalPrice = {
                    $gte: filters.minPrice,
                    $lte: filters.maxPrice,
                };
            } else if (filters.minPrice !== null) {
                // Only min provided
                priceMatchStage.totalPrice = { $gte: filters.minPrice };
            } else {
                // Only max provided
                priceMatchStage.totalPrice = { $lte: filters.maxPrice };
            }

            pipeline.push({ $match: priceMatchStage });
        }

        // Rating filter (recipes with average rating >= given rating)
        if (filters.rating !== null) {
            pipeline.push({
                $match: {
                    avgRating: { $gte: filters.rating },
                },
            });
        }

        // Sorting logic
        let sortStage = {};
        if (filters.trending || filters.premium || filters.recommended) {
            sortStage = { likeCountNum: -1, createdAt: -1 };
        } else if (filters.quick) {
            sortStage = { totalCookingTime: 1, createdAt: -1 };
        } else if (filters.fresh) {
            sortStage = { createdAt: -1 };
        }

        // Add sort stage if conditions exist
        if (Object.keys(sortStage).length > 0) {
            pipeline.push({ $sort: sortStage });
        }

        // Pagination
        pipeline.push({ $skip: startIndex });
        pipeline.push({ $limit: limit });

        // Execute aggregation
        const recipes = await Recipe.aggregate(pipeline);
        const count = recipes.length;

        // Final response
        return res.status(200).json(
            new ApiResponse(200, "Recipes fetched successfully", {
                count,
                recipes,
            })
        );
    } catch (error) {
        console.log("GetAllRecipes Error:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong fetching recipes")
        );
    }
};

// READ Single Recipe (OK)
const getRecipeById = async (req, res, next) => {
    try {
        const cacheKey = `recipe:${req.params.id}`;
        let recipe = await getCache(cacheKey);

        if (!recipe) {
            recipe = await Recipe.findOne({
                _id: req.params.id,
                isActive: true,
            }).populate("chefId");

            if (!recipe) {
                throw new ApiError(404, "Recipe not found");
            }

            await setCache(cacheKey, recipe, 3600);
        }

        // Premium Access Logic
        const chefId = recipe.chefId._id
            ? recipe.chefId._id.toString()
            : recipe.chefId.toString();

        const userId = req.user?._id?.toString();

        // Allow access if user is the chef (recipe owner)
        const isOwner = userId === chefId;

        // Check if user subscribed to chef
        const isSubscribed = req.user?.profile?.subscribed
            ?.map((id) => id.toString())
            .includes(chefId);

        if (recipe.isPremium && !isOwner && !isSubscribed) {
            // console.log(chefId);
            throw new ApiError(
                403,
                "Access denied: Premium Subscription Required",
                chefId
            );
        }

        /* This part deals with updating the user's suggestion queue */
        // normalize dietary labels so order differences don't create duplicates
        const sortedDietaryLabels = [...(recipe.dietaryLabels || [])].sort();

        // remove existing values
        await User.findByIdAndUpdate(userId, {
            $pull: {
                cuisineSuggested: recipe.cuisine,
                dietaryLabelsSuggested: sortedDietaryLabels,
            },
        });

        // push latest values
        await User.findByIdAndUpdate(userId, {
            $push: {
                cuisineSuggested: {
                    $each: [recipe.cuisine],
                    $slice: -10,
                },
                dietaryLabelsSuggested: {
                    $each: [sortedDietaryLabels],
                    $slice: -10,
                },
            },
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "Recipe found", recipe));
    } catch (error) {
        console.log("Some Error Occured: ", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong during fetching recipe"
                  )
        );
    }
};

const updateRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipe.findOneAndUpdate(
            { _id: req.params.id, isActive: true },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        ).populate("chefId");
        if (!recipe) {
            throw new ApiError(404, "Recipe not found");
        }
        // Update cache directly
        await setCache(`recipe:${req.params.id}`, recipe, 3600);

        await recipeQueue.add(
            "recipe-queue",
            {
                type: "UPDATE",
                recipe: recipe,
            },
            { removeOnComplete: true, removeOnFail: true }
        );

        return res
            .status(200)
            .json(new ApiResponse(200, "Recipe updated successfully", recipe));
    } catch (error) {
        console.log("Some Error Occured: ", error);
        // If the error is already an instance of ApiError, pass it to the error handler
        if (error instanceof ApiError) {
            return next(error);
        }

        // For all other errors, send a generic error message
        return next(
            new ApiError(500, "Something went wrong during recipe update")
        );
    }
};

const deleteRecipe = async (req, res, next) => {
    try {
        const recipe = await Recipe.findOneAndUpdate(
            { _id: req.params.id, isActive: true },
            { $set: { isActive: false } },
            { new: true }
        );
        if (!recipe) {
            throw new ApiError(404, "Recipe not found");
        }

        // Invalidate cache
        await deleteCache(`recipe:${req.params.id}`);

        await recipeQueue.add(
            "recipe-queue",
            {
                type: "DELETE",
                recipe: recipe,
            },
            { removeOnComplete: true, removeOnFail: true }
        );

        return res
            .status(200)
            .json(new ApiResponse(200, "Recipe deleted successfully"));
    } catch (error) {
        console.log("Some Error Occured: ", error);

        error instanceof ApiError
            ? next(error)
            : next(
                  new ApiError(
                      500,
                      "Something went wrong during recipe deletion"
                  )
              );
    }
};

const HandleGetTrendingRecipes = async (req, res, next) => {
    try {
        // const thirtyDaysAgo = new Date();
        // thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const limit = Number(req.query.limit) || 10;
        const cacheKey = `feed:trending:${limit}`;

        let trendingRecipes = await getCache(cacheKey);

        if (!trendingRecipes) {
            trendingRecipes = await Recipe.aggregate([
                // Only recipes created in last 30 days
                // {
                //     $match: {
                //         createdAt: { $gte: thirtyDaysAgo },
                //     },
                // },

                // Consider only active recipes
                {
                    $match: {
                        isActive: true,
                    },
                },

                // Compute like count
                {
                    $addFields: {
                        likeCountTotal: {
                            $size: { $ifNull: ["$likeCount", []] },
                        },
                    },
                },

                // Sort by likeCount desc
                { $sort: { likeCountTotal: -1, createdAt: -1 } },

                // Limit to 10
                { $limit: limit },

                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        "thumbnail.secure_url": 1,
                        chefId: 1,
                        isPremium: 1,
                        servings: 1,
                        cuisine: 1,
                        dietaryLabels: 1,
                        likeCount: 1,
                    },
                },
            ]);
            await setCache(cacheKey, trendingRecipes, 300);
        }
        // console.log(likeCountTotal);
        // console.log(trendingRecipes);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Trending recipes fetched successfully",
                    trendingRecipes
                )
            );
    } catch (error) {
        console.log("Error Occured While Fetching Trending Recipes: ", error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong fetching trending recipes"
                  )
        );
    }
};

const HandleGetFreshRecipes = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const cacheKey = `feed:fresh:${limit}`;

        let freshRecipes = await getCache(cacheKey);

        if (!freshRecipes) {
            freshRecipes = await Recipe.aggregate([
                // Consider only active recipes
                {
                    $match: {
                        isActive: true,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $limit: limit,
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        "thumbnail.secure_url": 1,
                        chefId: 1,
                        isPremium: 1,
                        servings: 1,
                        cuisine: 1,
                        dietaryLabels: 1,
                        likeCount: 1,
                    },
                },
            ]);
            await setCache(cacheKey, freshRecipes, 300);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Fresh & New recipes fetched successfully",
                    freshRecipes
                )
            );
    } catch (error) {
        console.log("Error fetching fresh recipes:", error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong fetching fresh recipes"
                  )
        );
    }
};

const HandleGetQuickRecipes = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const maxTime = Number(req.query.maxTime);
        const cacheKey = `feed:quick:${limit}:${maxTime || "all"}`;

        let quickRecipes = await getCache(cacheKey);

        if (!quickRecipes) {
            const pipeline = [];

            // If maxTime is sent from frontend → apply filter
            if (maxTime !== null && !isNaN(maxTime)) {
                pipeline.push({
                    $match: {
                        totalCookingTime: { $lte: maxTime },
                    },
                });
            }

            pipeline.push(
                // Consider only active recipes
                {
                    $match: {
                        isActive: true,
                    },
                },
                { $sort: { totalCookingTime: 1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        "thumbnail.secure_url": 1,
                        chefId: 1,
                        isPremium: 1,
                        servings: 1,
                        cuisine: 1,
                        dietaryLabels: 1,
                        likeCount: 1,
                        // totalCookingTime: 1,
                    },
                }
            );

            quickRecipes = await Recipe.aggregate(pipeline);

            // console.log(quickRecipes);
            await setCache(cacheKey, quickRecipes, 300);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Quick & Easy recipes fetched successfully",
                    quickRecipes
                )
            );
    } catch (error) {
        console.log("Error fetching quick recipes:", error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong fetching quick recipes"
                  )
        );
    }
};

const HandleGetPremiumRecipes = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const cacheKey = `feed:premium:${limit}`;

        let premiumRecipes = await getCache(cacheKey);
        if (!premiumRecipes) {
            premiumRecipes = await Recipe.aggregate([
                {
                    $match: {
                        isPremium: true,
                        isActive: true,
                    },
                },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        "thumbnail.secure_url": 1,
                        chefId: 1,
                        isPremium: 1,
                        servings: 1,
                        cuisine: 1,
                        dietaryLabels: 1,
                        likeCount: 1,
                        // totalCookingTime: 1,
                    },
                },
            ]);

            await setCache(cacheKey, premiumRecipes, 300);
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Premium recipes fetched successfully",
                    premiumRecipes
                )
            );
    } catch (error) {
        console.log("Error fetching premium recipes:", error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong fetching premium recipes"
                  )
        );
    }
};

const HandleGetRecommendedRecipes = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        const userId = req?.user?._id?.toString() || "guest";
        const cacheKey = `feed:recommended:${userId}:${limit}`;

        let recommendedRecipes = await getCache(cacheKey);
        if (!recommendedRecipes) {
            // Get the logged-in user's preferences
            const { cuisine, dietaryLabels } = req?.user?.profile || {};
            const { cuisineSuggested, dietaryLabelsSuggested } =
                req?.user || {};

            // flatten + merge
            const allCuisines = [cuisine, ...(cuisineSuggested || [])].filter(
                Boolean
            );
            const allDietary = [
                ...(dietaryLabels || []),
                ...(dietaryLabelsSuggested?.flat() || []),
            ].filter(Boolean);

            // build a single semantic search query string and exclude duplicates
            const searchQuery =
                [...new Set(allCuisines), ...new Set(allDietary)].join(" ") ||
                "Popular";

            // search for similar recipes
            const similarRecipes = await similaritySearch(searchQuery, limit);
            const uuids = similarRecipes.map((item) => item.id);
            recommendedRecipes = await Recipe.find({
                uuid: { $in: uuids },
            }).select("-ingredients -steps -reviews -externalMediaLinks");

            await setCache(cacheKey, recommendedRecipes, 300); // 300s for recommended
        }

        // Send success response
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Recommended recipes fetched successfully",
                    recommendedRecipes
                )
            );
    } catch (error) {
        console.log("Error fetching recommended recipes:", error);

        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong fetching recommended recipes"
                  )
        );
    }
};

const handleLikeRecipe = async (req, res, next) => {
    try {
        const { id: recipeId } = req.params;
        const user = req.user; // from auth middleware

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return next(new ApiError(404, "Recipe not found"));
        }
        const alreadyLiked = recipe.likeCount?.includes(user._id);

        if (alreadyLiked) {
            return res.status(200).json(
                new ApiResponse(200, "Recipe added to favourites", {
                    recipeId,
                    liked: true,
                    totalLikes: recipe.likeCount.length,
                })
            );
        }
        // add like
        recipe.likeCount.push(user._id);
        user.favourites.push(recipeId);

        // concurrent save instead of sequential
        await Promise.all([recipe.save(), user.save()]);

        // Update caches directly
        await deleteCache(`recipe:${recipeId}`);
        await deleteCache(`user:${user._id}:profile`);
        await deleteCache(`user:${user._id}:favourites`);

        return res.status(200).json(
            new ApiResponse(200, "Recipe added to favourites", {
                recipeId,
                liked: true,
                totalLikes: recipe.likeCount.length,
            })
        );
    } catch (error) {
        console.log("Error while adding recipe to favourites:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while adding recipe to favourites"
                  )
        );
    }
};

const handleUnlikeRecipe = async (req, res, next) => {
    try {
        const { id: recipeId } = req.params;
        const user = req.user; // from auth middleware

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return next(new ApiError(404, "Recipe not found"));
        }

        const alreadyLiked = recipe.likeCount?.includes(user._id);

        if (!alreadyLiked) {
            return res.status(200).json(
                new ApiResponse(200, "Recipe removed from favourites", {
                    recipeId,
                    liked: false,
                    totalLikes: recipe.likeCount.length,
                })
            );
        }

        // remove like
        recipe.likeCount.pull(user._id);
        user.favourites.pull(recipeId);

        // concurrent save instead of sequential
        await Promise.all([recipe.save(), user.save()]);

        await deleteCache(`recipe:${recipeId}`);
        await deleteCache(`user:${user._id}:profile`);
        await deleteCache(`user:${user._id}:favourites`);

        return res.status(200).json(
            new ApiResponse(200, "Recipe removed from favourites", {
                recipeId,
                liked: false,
                totalLikes: recipe.likeCount.length,
            })
        );
    } catch (error) {
        console.log("Error removing from favourites:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while removing from favourites"
                  )
        );
    }
};

const handleGetSearchRecipe = async (req, res, next) => {
    try {
        const {
            query,
            cuisine,
            diet,
            rating,
            priceMin,
            priceMax,
            sort,
            premium,
        } = req.query;

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const pipeline = [];

        // ================= SEARCH =================
        pipeline.push({
            $match: { isActive: true },
        });

        if (query) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } },
                        {
                            "steps.instruction": {
                                $regex: query,
                                $options: "i",
                            },
                        },
                    ],
                },
            });
        }

        // CUISINE
        if (cuisine) {
            pipeline.push({
                $match: { cuisine },
            });
        }

        // DIET
        if (diet) {
            const dietArray = diet
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean);

            if (dietArray.length > 0) {
                pipeline.push({
                    $match: {
                        dietaryLabels: { $in: dietArray },
                    },
                });
            }
        }

        // RATING FILTER
        let isAvgRatingComputed = false;

        if (rating) {
            pipeline.push({
                $addFields: {
                    avgRating: {
                        $ifNull: [{ $avg: "$reviews.rating" }, 0],
                    },
                },
            });

            isAvgRatingComputed = true;

            const ratingNum = Number(rating);
            if (!isNaN(ratingNum)) {
                pipeline.push({
                    $match: {
                        avgRating: { $gte: ratingNum },
                    },
                });
            }
        }

        // PRICE FILTER
        if (priceMin || priceMax) {
            pipeline.push({
                $addFields: {
                    totalCost: {
                        $sum: {
                            $map: {
                                input: "$ingredients",
                                as: "ing",
                                in: { $ifNull: ["$$ing.marketPrice", 0] },
                            },
                        },
                    },
                },
            });

            const priceQuery = {};
            const min = Number(priceMin);
            const max = Number(priceMax);

            if (!isNaN(min)) priceQuery.$gte = min;
            if (!isNaN(max)) priceQuery.$lte = max;

            if (Object.keys(priceQuery).length > 0) {
                pipeline.push({
                    $match: {
                        totalCost: priceQuery,
                    },
                });
            }
        }

        if (premium === "true") {
            pipeline.push({
                $match: {
                    isPremium: premium === "true",
                },
            });
        }

        // ================= SORTING =================
        let sortStage = {};

        // Default / Relevance
        if (!sort || sort === "relevance") {
            sortStage = { createdAt: -1 }; // newest first
        }

        // Highest Rated
        if (sort === "rating") {
            // avoid duplicate avgRating computation
            if (!isAvgRatingComputed) {
                pipeline.push({
                    $addFields: {
                        avgRating: {
                            $ifNull: [{ $avg: "$reviews.rating" }, 0],
                        },
                    },
                });
            }

            sortStage = { avgRating: -1 };
        }

        // Most Popular (likes count)
        if (sort === "popularity") {
            pipeline.push({
                $addFields: {
                    likesCount: {
                        $size: { $ifNull: ["$likeCount", []] },
                    },
                },
            });

            sortStage = { likesCount: -1 };
        }

        // Quickest Recipes
        if (sort === "time") {
            sortStage = { totalCookingTime: 1 };
        }

        // Premium First
        if (sort === "premium") {
            sortStage = { isPremium: -1 };
        }

        // apply sorting
        if (Object.keys(sortStage).length > 0) {
            pipeline.push({
                $sort: sortStage,
            });
        }

        // ================= PAGINATION =================
        pipeline.push({
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            "thumbnail.secure_url": 1,
                            chefId: 1,
                            isPremium: 1,
                            servings: 1,
                            cuisine: 1,
                            dietaryLabels: 1,
                            likeCount: 1,
                            // totalCookingTime: 1,
                        },
                    },
                ],
                totalCount: [{ $count: "count" }],
            },
        });

        const result = await Recipe.aggregate(pipeline);

        const recipes = result[0]?.data || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        res.status(200).json(
            new ApiResponse(200, "Recipes fetched successfully", {
                recipes,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            })
        );
    } catch (error) {
        console.log("Error while searching for recipes:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while searching for recipes."
                  )
        );
    }
};

const getSimilarRecipes = async (req, res, next) => {
    try {
        const limit = Number(req.query.limit) || 10;
        const cacheKey = `recipe:${req.params.id}`;
        let recipe = await getCache(cacheKey);

        if (!recipe) {
            recipe = await Recipe.findOne({
                _id: req.params.id,
                isActive: true,
            });
            if (!recipe) {
                throw new ApiError(404, "Recipe not found");
            }

            await setCache(cacheKey, recipe, 3600);
        }

        const searchQuery = `${recipe.cuisine} ${recipe.dietaryLabels.join(" ")} ${recipe.ingredients.map((ing) => ing.name).join(" ")}`;

        const similarRecipes = await similaritySearch(searchQuery, limit + 1);
        const uuids = similarRecipes
            .map((item) => item.id)
            .filter((id) => id !== recipe.uuid)
            .slice(0, limit);
        const recipes = await Recipe.find({
            uuid: { $in: uuids },
        }).select("-ingredients -steps -reviews -externalMediaLinks");

        return res
            .status(200)
            .json(new ApiResponse(200, "Similar recipes found", recipes));
    } catch (error) {
        console.log("Error while fetching similar recipes:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(
                      500,
                      "Something went wrong while fetching similar recipes."
                  )
        );
    }
};

export {
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
    getSimilarRecipes,
};
