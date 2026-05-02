import { APP_CONTEXT } from "../appContext/prompt.js";
import { miniModel } from "../models/llm.factory.js";
import { SystemMessage } from "@langchain/core/messages";
import { buildMessageHistory } from "../utils/buildMessageHistory.js";
import { getLanguage } from "../utils/getLanguage.js";

const buildRecipeContext = (recipes) => {
    const hasRecipes = recipes?.length > 0;

    return JSON.stringify({
        recipesFound: hasRecipes ? recipes : null,
        note: hasRecipes
            ? "Present the recipes below to the user naturally."
            : "No recipes were found. Respond with a friendly fallback message.",
    });
};

const DRAFT_REPLY_SYSTEM_PROMPT = (recipes, language) => `
You are a friendly recipe recommendation assistant.
Your job is to write a short, natural reply that presents the fetched recipes to the user.

<rules>
  1. Only reference recipes provided in the context — never invent names, ingredients, or details.
  2. Use conversation history to understand what the user was originally looking for, especially for follow-ups like "more of those" or "something similar".
  3. Lead with a one-sentence acknowledgment of the user's request.
  4. Present each recipe as a brief entry: name + one-line description pulled from the provided data.
  5. If no recipes were found, apologize briefly and suggest the user try a different search.
  6. Keep the tone warm and conversational.
  7. Do not use markdown, headers, or bold text in the reply.
  8. Ask a follow-up question if the user's request was not clear.
  9. Use Language:${language} for generating this response.
</rules>

<fetched_recipes_context>
${recipes}
</fetched_recipes_context>

${APP_CONTEXT}
`;

export async function draftReplyNode(state) {
    const history = buildMessageHistory(state.messages);

    const msg = await miniModel.invoke([
        new SystemMessage(
            DRAFT_REPLY_SYSTEM_PROMPT(
                buildRecipeContext(state.recipes),
                getLanguage(state.language)
            )
        ),
        ...history,
    ]);

    return {
        reply: msg.content,
    };
}
