import { nanoModel } from "../models/llm.factory.js";
import { routeSchema } from "../schemas/state.schema.js";
import {
    SystemMessage,
} from "@langchain/core/messages";
import { buildMessageHistory } from "../utils/buildMessageHistory.js";

const routeLLM = nanoModel.withStructuredOutput(routeSchema, {
    name: "decide_recipe_route",
    strict: true,
});

const ROUTE_SYSTEM_PROMPT = `
You are a routing classifier for a cooking assistant.

<routes>
  - recipe_search   → User wants to find, discover, or get recipes
  - cooking_tip     → User wants advice, techniques, substitutions, or how-to guidance
  - other           → Anything unrelated to recipes or cooking
</routes>

<instructions>
  1. Read the full conversation history.
  2. Use the latest user message as the main signal.
  3. If the latest user message is a follow-up, use earlier messages only to resolve context.
  4. Choose exactly one route.
  5. If both recipe_search and cooking_tip could apply, choose recipe_search.
</instructions>

<requestedCount_rules>
  - requestedCount is only meaningful for recipe_search.
  - Return requestedCount as a whole number.
  - If the user gives a number, use that exact number.
  - If the user says "a couple", use 2.
  - If the user says "a few", use 3.
  - If the user says "several", "some", "many", "ideas", "options", or does not specify a count, use 5.
  - If the user asks for "one", "single", "only" or "an example", use 1.
  - If the user asks for a range like "3-5", use the lower bound only.
  - Ignore ingredient quantities, serving sizes, or unrelated numbers.
  - For cooking_tip and other, set requestedCount to 0.
</requestedCount_rules>

<output_rules>
  - For recipe_search, return route = "recipe_search" and the extracted requestedCount.
  - For cooking_tip, return route = "cooking_tip" and requestedCount = 0.
  - For other, return route = "other" and requestedCount = 0.
</output_rules>
`;

export async function decideRouteNode(state) {
    const { isRecipeSearch, isCookingTip } = state.toolInUse || {};
    const history = buildMessageHistory(state.messages);

    const out = await routeLLM.invoke([
        new SystemMessage(ROUTE_SYSTEM_PROMPT),
        ...history,
    ]);

    if (out.route === "other") {
        return { route: "other", requestedCount: 0 };
    }

    if (isRecipeSearch && !isCookingTip) {
        return {
            route: "recipe_search",
            requestedCount: out.requestedCount,
        };
    }

    if (isCookingTip && !isRecipeSearch) {
        return { route: "cooking_tip", requestedCount: 0 };
    }

    return {
        route: out.route,
        requestedCount: out.requestedCount,
    };
}
