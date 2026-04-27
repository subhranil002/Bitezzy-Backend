import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

export const thumbnailSchema = z.object({
    public_id: z.string().default(""),
    secure_url: z.string().default(""),
});

export const recipesSchema = z.array(
    z
        .object({
            _id: z.string(),
            title: z.string(),
            cuisine: z.string(),
            thumbnail: thumbnailSchema,
            score: z.number().optional(),
        })
        .strip()
);

export const toolInUseSchema = z
    .object({
        isRecipeSearch: z.boolean().default(false),
        isCookingTip: z.boolean().default(false),
    })
    .default({
        isRecipeSearch: false,
        isCookingTip: false,
    });

export const routeSchema = z.object({
    route: z.enum(["cooking_tip", "recipe_search", "other"]),
    requestedCount: z.number().int().min(1).max(5),
});

export const translatedQuerySchema = z.object({
    translatedQuery: z.string().min(3),
});

export const State = new StateSchema({
    userInput: z.string().min(3),
    toolInUse: toolInUseSchema,

    route: routeSchema.optional(),
    requestedCount: z.number().int().min(1).max(5).default(5),

    translatedQuery: z.string().min(1).optional(),
    recipes: recipesSchema.optional(),
    reply: z.string().optional(),
});
