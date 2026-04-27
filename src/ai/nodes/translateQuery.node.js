import { miniModel } from "../models/llm.factory.js";
import { translatedQuerySchema } from "../schemas/state.schema.js";

const translateUserQueryLLM = miniModel.withStructuredOutput(
    translatedQuerySchema,
    {
        name: "translate_user_query",
        strict: true,
    }
);

const TRANSLATE_QUERY_PROMPT = (userInput) => `
You are a query normalizer for a cooking assistant search pipeline.
Your sole job is to rewrite the user's raw input into a clean, search-optimized query.

<rules>
  1. Preserve the original intent exactly — do not infer, expand, or add details not present.
  2. Fix spelling and grammatical errors.
  3. Remove filler words (e.g. "umm", "like", "can you", "I want", "please", "show me").
  4. Normalize informal or vague phrasing into precise culinary language where possible.
  5. Output plain text only — no markdown, punctuation, or trailing periods.
</rules>

<examples>
  Input:  "umm can you show me like something with chicken and rice maybe?"
  Output: chicken and rice recipes

  Input:  "i want somthing spicy for dinner tonight"
  Output: spicy dinner recipes

  Input: "How do I make a chicken curry?"
  Output: "Chicken curry recipes"
</examples>

<user_input>
  ${userInput}
</user_input>
`;

export async function translateUserQueryNode(state) {
    const out = await translateUserQueryLLM.invoke(
        TRANSLATE_QUERY_PROMPT(state.userInput)
    );

    return {
        translatedQuery: out.translatedQuery,
    };
}
