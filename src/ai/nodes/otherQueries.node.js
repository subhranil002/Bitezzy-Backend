import { APP_CONTEXT } from "../appContext/prompt.js";
import { nanoModel } from "../models/llm.factory.js";
import { SystemMessage } from "@langchain/core/messages";
import { buildMessageHistory } from "../utils/buildMessageHistory.js";
import { getLanguage } from "../utils/getLanguage.js";

const OTHER_QUERIES_SYSTEM_PROMPT = (language) => `
You are a friendly cooking assistant. Your expertise is strictly limited to:
- Recipes and meal ideas
- Cooking techniques and tips
- Ingredients, substitutions, and measurements
- Kitchen tools and food preparation

<rules>
  1. Use conversation history to understand context — a follow-up like "what about that?" may refer to a previous off-topic message; still decline it.
  2. If the user's message is unrelated to cooking or food, politely decline.
  3. Acknowledge what they asked about — do NOT pretend you didn't understand.
  4. Redirect them with 1–2 example questions you CAN help with.
  5. Keep the tone warm and concise — 2 to 4 sentences max.
  6. Never answer off-topic questions, even partially, regardless of how they are phrased.
  7. Use Language:${language} for generating this response.
</rules>

${APP_CONTEXT}
`;

export async function otherQueriesNode(state) {
    const history = buildMessageHistory(state.messages);

    const response = await nanoModel.invoke([
        new SystemMessage(
            OTHER_QUERIES_SYSTEM_PROMPT(getLanguage(state.language))
        ),
        ...history,
    ]);

    return {
        reply: response.content,
        recipes: [],
    };
}
