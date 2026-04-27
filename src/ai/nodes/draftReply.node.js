import { miniModel } from "../models/llm.factory.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const DRAFT_REPLY_SYSTEM_PROMPT = `
You are a friendly recipe recommendation assistant. 
Your job is to write a short, natural reply that presents the fetched recipes to the user.

<rules>
  1. Only reference recipes provided in the context — never invent names, ingredients, or details.
  2. Lead with a one-sentence acknowledgment of the user's request.
  3. Present each recipe as a brief entry: name + one-line description pulled from the provided data.
  4. If no recipes were found, apologize briefly and suggest the user try a different search.
  5. Keep the tone warm and conversational.
  6. Do not use markdown, headers, or bold text in the reply.
  7. End with a closing statement only — do not ask the user any questions.
</rules>
`;

const buildUserMessage = (userInput, recipes) => {
    const hasRecipes = recipes?.length > 0;

    return JSON.stringify({
        userRequest: userInput,
        recipesFound: hasRecipes ? recipes : null,
        note: hasRecipes
            ? "Present the recipes below to the user naturally."
            : "No recipes were found. Respond with a friendly fallback message.",
    });
};

export async function draftReplyNode(state) {
    const msg = await miniModel.invoke([
        new SystemMessage(DRAFT_REPLY_SYSTEM_PROMPT),
        new HumanMessage(buildUserMessage(state.userInput, state.recipes)),
    ]);

    return {
        reply: msg.content,
    };
}
