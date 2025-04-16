import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { agentStateModifier } from "./supervisor";
import { SQLllm,Pythonllm } from "./model";
import { runAgentNode } from "./supervisor";
import { pgTools, pythonTools } from "./mcp-nodes";

export const ResearchTeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  team_members: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "supervisor",
  }),
  instructions: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "Solve the human's question.",
  }),
})


export const pythonNode = (state: typeof ResearchTeamState.State) => {
    const stateModifier = agentStateModifier(
      "You are a Python expert who can execute Python code to analyze data and solve problems",
      pythonTools,
      state.team_members ?? ["PythonExpert"],
    )
    const pythonAgent = createReactAgent({
      llm: Pythonllm,
      tools: pythonTools,
      stateModifier,
    })
    return runAgentNode({ state, agent: pythonAgent, name: "PythonExpert" });
  };

  export const pgNode = (state: typeof ResearchTeamState.State) => {
    const stateModifier = agentStateModifier(
      "You are a database expert who can query postgresql databases for information.",
      pgTools,
      state.team_members ?? ["DatabaseExpert"],
    )
    const pgAgent = createReactAgent({
      llm: SQLllm,
      tools: pgTools,
      stateModifier,
    })
    return runAgentNode({ state, agent: pgAgent, name: "DatabaseExpert" });
  };