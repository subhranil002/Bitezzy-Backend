import {
    HumanMessage,
    AIMessage,
} from "@langchain/core/messages";

export function buildMessageHistory(messages) {
    return messages.map((m) =>
        m.role === "user"
            ? new HumanMessage(m.content)
            : new AIMessage(m.content)
    );
}
