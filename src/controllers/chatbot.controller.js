import { ApiError, ApiResponse } from "../utils/index.js";
import { userQueryProcessor } from "../jobs/userQuery.processor.js";

export async function bitebot(req, res, next) {
    try {
        const { messages, toolInUse, language } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            throw new ApiError(400, "No user input provided");
        }

        const result = await userQueryProcessor({
            messages: messages,
            toolInUse: toolInUse ?? {
                isRecipeSearch: false,
                isCookingTip: false,
            },
            language: language ?? "en",
        });

        return res.status(200).json(
            new ApiResponse(200, "Agent response received", {
                reply: result.reply || "",
                recipes: result.recipes || [],
            })
        );
    } catch (error) {
        console.error("Error while chatting with Bitebot:", error);
        return next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Something went wrong while chatting with Bitebot")
        );
    }
}