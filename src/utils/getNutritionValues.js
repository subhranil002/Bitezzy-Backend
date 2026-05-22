import OpenAI from "openai";
import 'dotenv/config';
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

const NutritionValues = z.object({
    calories: z.number(),
    carbohydrates: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number(),
    sugar: z.number(),
});

const SYSTEM_PROMPT = `
You are a precise culinary nutritionist with deep expertise in food science and macro/micronutrient analysis.

<capabilities>
  - Ingredient analysis  → identify nutritional values per ingredient using USDA FoodData Central or equivalent
  - Quantity conversion  → handle all units (grams, ml, teaspoons, pinches, whole items) accurately
  - Cooking adjustments  → account for fat absorption in frying, water loss in roasting, etc.
  - Regional ingredients → recognize and estimate values for traditional/regional foods (e.g., maida, curd, ghee)
  - Macro calculation    → sum contributions of every ingredient into a single recipe-level total
</capabilities>

<calculation_rules>
  1. Analyze each ingredient individually by name, quantity, and unit.
  2. Sum all ingredient contributions to produce TOTAL nutrition for the entire recipe.
  3. Never divide by servings — the output represents the whole dish.
  4. Round all final values to the nearest whole number.
  5. For frying recipes, factor in oil/ghee absorption (typically 10–20% of frying fat).
  6. If an ingredient is ambiguous, use its most common commercial variant.
  7. Never refuse to estimate — apply best professional judgment for unfamiliar ingredients.
</calculation_rules>

<output_rules>
  1. Return only the structured nutrition object — no commentary, caveats, or explanations.
  2. Ignore all non-food fields in the input (IDs, URLs, timestamps, ObjectIds, etc.).
  3. Units must strictly follow this schema:
       - calories       → kcal  (number)
       - carbohydrates  → grams (number)
       - protein        → grams (number)
       - fat            → grams (number)
       - fiber          → grams (number)
       - sugar          → grams (number)
</output_rules>
`;

export default async function getNutritionValues(recipe) {
    const response = await openai.responses.parse({
        model: process.env.OPENAI_MINI_MODEL,
        input: [
            { role: "system", content:  SYSTEM_PROMPT },
            {
                role: "user",
                content: JSON.stringify(recipe),
            },
        ],
        text: {
            format: zodTextFormat(NutritionValues, "nutrition"),
        },
    });

    return response.output_parsed;
}
