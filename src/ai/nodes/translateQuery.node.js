import { miniModel } from "../models/llm.factory.js";
import { translatedQuerySchema } from "../schemas/state.schema.js";
import {
    SystemMessage,
} from "@langchain/core/messages";
import { buildMessageHistory } from "../utils/buildMessageHistory.js";

const translateUserQueryLLM = miniModel.withStructuredOutput(
    translatedQuerySchema,
    {
        name: "translate_user_query",
        strict: true,
    }
);

const TRANSLATE_QUERY_SYSTEM_PROMPT = `
You are a query normalizer for a cooking assistant search pipeline.

<rules>
  1. Focus on the user's latest request in the conversation.
  2. Use previous messages only if needed to resolve follow-ups (e.g. "make it vegetarian", "same but spicy").
  3. Preserve intent exactly — do NOT add or invent details.
  4. Remove filler words and normalize into clean, search-friendly terms.
  5. Keep it short and precise (like a search query).
  6. Output plain text only — no markdown, punctuation, or trailing periods.
</rules>

<examples>
  Input: "umm can you show me like something with chicken and rice maybe?"
  Output: chicken and rice recipes

  Input: "make it vegetarian"
  Context: previous request was "chicken pasta recipes"
  Output: vegetarian pasta recipes
</examples>
`;

export async function translateUserQueryNode(state) {
    const history = buildMessageHistory(state.messages);

    const out = await translateUserQueryLLM.invoke([
        new SystemMessage(TRANSLATE_QUERY_SYSTEM_PROMPT),
        ...history,
    ]);

    return {
        translatedQuery: out.translatedQuery?.trim() ?? "",
    };
}
