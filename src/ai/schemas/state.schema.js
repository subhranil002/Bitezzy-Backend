import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

const messagesSchema = z.array(
    z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1, "Content cannot be empty"),
    })
);

const toolInUseSchema = z
    .object({
        isRecipeSearch: z.boolean().default(false),
        isCookingTip: z.boolean().default(false),
    })
    .default({
        isRecipeSearch: false,
        isCookingTip: false,
    });

const languageSchema = z.enum(["en", "hi", "bn"]).default("en");

export const routeSchema = z.object({
    route: z.enum(["cooking_tip", "recipe_search", "other"]),
    requestedCount: z.number().int().min(1).max(5),
});

export const translatedQuerySchema = z.object({
    translatedQuery: z.string().min(3),
});

const thumbnailSchema = z.object({
    public_id: z.string().default(""),
    secure_url: z.string().default(""),
});

const ingredientSchema = z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    marketPrice: z.number(),
});

const nutritionSchema = z.object({
    calorie: z.number(),
    carbohydrate: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number(),
    sugar: z.number(),
});

export const recipesSchema = z.array(
    z
        .object({
            _id: z.preprocess((val) => val?.toString(), z.string()),
            title: z.string(),
            description: z.string(),
            thumbnail: thumbnailSchema,
            cuisine: z.string(),
            chefId: z.preprocess((val) => val?.toString(), z.string()),
            totalCookingTime: z.number(),
            servings: z.number(),
            isPremium: z.boolean(),
            ingredients: z.array(ingredientSchema),
            dietaryLabels: z.array(z.string()),
            nutrition: nutritionSchema,
        })
        .strip()
);

export const State = new StateSchema({
    messages: messagesSchema,
    toolInUse: toolInUseSchema,
    language: languageSchema,

    route: routeSchema.optional(),
    requestedCount: z.number().int().min(1).max(5).default(0),

    translatedQuery: z.string().min(1).optional(),
    recipes: recipesSchema.optional(),
    reply: z.string().optional(),
});
