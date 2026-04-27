import { ChatOpenAI } from "@langchain/openai";
import 'dotenv/config';

export const nanoModel = new ChatOpenAI({
    model: process.env.OPENAI_NANO_MODEL,
});

export const miniModel = new ChatOpenAI({
    model: process.env.OPENAI_MINI_MODEL,
});
