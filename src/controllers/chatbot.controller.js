import { ApiError, ApiResponse } from "../utils/index.js";
import { userQueryProcessor } from "../jobs/userQuery.processor.js";

export async function recipeChat(req, res, next) {
    try {
        const { userInput, toolInUse } = req.body;

        if (!userInput) {
            throw new ApiError(400, "No user input provided");
        }

        const result = await userQueryProcessor({
            userInput,
            toolInUse: toolInUse ?? {
                isRecipeSearch: false,
                isCookingTip: false,
            },
        });

        return res.status(200).json(
            new ApiResponse(200, "Agent response received", {
                reply: result.reply || "",
                recipes: result.recipes || [],
            })
        );
    } catch (error) {
        console.error(error);
        return next(
            new ApiError(500, `recipe.controller :: recipeChat: ${error}`)
        );
    }
}
