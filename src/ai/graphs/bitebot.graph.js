import { StateGraph, START, END } from "@langchain/langgraph";
import { State } from "../schemas/state.schema.js";
import { decideRouteNode } from "../nodes/decideRoute.node.js";
import { cookingTipNode } from "../nodes/cookingTip.node.js";
import { translateUserQueryNode } from "../nodes/translateQuery.node.js";
import { searchRecipesNode } from "../nodes/searchRecipes.node.js";
import { draftReplyNode } from "../nodes/draftReply.node.js";
import { otherQueriesNode } from "../nodes/otherQueries.node.js";

export const bitebotGraph = new StateGraph(State)
    .addNode("decideRoute", decideRouteNode)
    .addNode("cookingTip", cookingTipNode)
    .addNode("translateUserQuery", translateUserQueryNode)
    .addNode("searchRecipes", searchRecipesNode)
    .addNode("draftReply", draftReplyNode)
    .addNode("otherQueries", otherQueriesNode)

    .addEdge(START, "decideRoute")
    .addConditionalEdges("decideRoute", (state) => state.route, {
        cooking_tip: "cookingTip",
        recipe_search: "translateUserQuery",
        other: "otherQueries",
    })
    .addEdge("translateUserQuery", "searchRecipes")
    .addEdge("searchRecipes", "draftReply")
    .addEdge("draftReply", END)
    .addEdge("cookingTip", END)
    .addEdge("otherQueries", END)

    .compile();
