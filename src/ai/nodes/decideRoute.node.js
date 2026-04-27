import { nanoModel } from "../models/llm.factory.js";
import { routeSchema } from "../schemas/state.schema.js";

const routeLLM = nanoModel.withStructuredOutput(routeSchema, {
    name: "decide_recipe_route",
    strict: true,
});

const ROUTE_PROMPT = (userInput) => `
You are a routing classifier for a cooking assistant. Analyze the user's message and classify it into exactly one route.

<routes>
  - recipe_search   → User wants to find, discover, or get recipes (e.g. "show me pasta recipes", "give me 3 chicken dishes")
  - cooking_tip     → User wants advice, techniques, substitutions, or how-to guidance (e.g. "how do I julienne carrots?", "what can I use instead of butter?")
  - other           → Anything unrelated to recipes or cooking
</routes>

<rules>
  1. Choose only ONE route — the most specific match wins.
  2. If the message fits both recipe_search and cooking_tip, prefer recipe_search.
  3. For recipe_search: extract requestedCount (how many recipes the user wants).
     - Default and maximum: 5
     - Minimum: 1
     - If not explicitly stated, use 5.
  4. For cooking_tip or other: set requestedCount to 0.
</rules>

<user_message>
${userInput}
</user_message>
`;

export async function decideRouteNode(state) {
    const { isRecipeSearch, isCookingTip } = state.toolInUse || {};

    const out = await routeLLM.invoke(ROUTE_PROMPT(state.userInput));

    if (out.route === "other") {
        return { route: "other", requestedCount: 0 };
    }

    if (isRecipeSearch && !isCookingTip) {
        return {
            route: "recipe_search",
            requestedCount: out.requestedCount ?? 5,
        };
    }

    if (isCookingTip && !isRecipeSearch) {
        return { route: "cooking_tip", requestedCount: 0 };
    }

    return {
        route: out.route,
        requestedCount: out.requestedCount ?? 5,
    };
}
