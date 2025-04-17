import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { agentStateModifier } from "./supervisor";
import { SQLllm, Pythonllm } from "./model";
import { runAgentNode } from "./supervisor";
import { pgTools, pythonTools } from "./mcp-nodes";

export const ResearchTeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  // store the big SQL payload only once
  dbResult: Annotation<any>({
    reducer: (_, y) => y ?? _,
  }),
  // store the distilled metrics from Python
  analysisSummary: Annotation<any>({
    reducer: (_, y) => y ?? _,
  }),
  team_members: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
  next: Annotation<string>({
    reducer: (_, y) => y ?? _,
    default: () => "supervisor",
  }),
  instructions: Annotation<string>({
    reducer: (_, y) => y ?? _,
    default: () => "Solve the human's question.",
  }),
});

export const pgNode = (state: typeof ResearchTeamState.State) => {
  const stateModifier = agentStateModifier(
    `You are a database expert who can query PostgreSQL databases for information.
Always:
1. Check information_schema.columns once and cache.
2. Return results as JSON: { "sql": "...", "row_count": <int>, "rows": [...] }`,
    pgTools,
    state.team_members ?? ["DatabaseExpert"],
  );

  const pgAgent = createReactAgent({
    llm: SQLllm,
    tools: pgTools,
    stateModifier,
  });

  return runAgentNode({ state, agent: pgAgent, name: "DatabaseExpert" })
    .then((result) => {
      const raw = result.messages[0].content;
      let payload: any;
      if (typeof raw === 'string') {
        try {
          payload = JSON.parse(raw);
        } catch {
          // not pure JSON, keep raw string
          payload = raw;
        }
      } else {
        payload = raw;
      }
      return {
        ...result,
        // stash the full DB payload for downstream reuse
        dbResult: payload,
      };
    });
};

export const pythonNode = (state: typeof ResearchTeamState.State) => {
  const stateModifier = agentStateModifier(
    "You are a Python expert who can execute Python code to analyze data and solve problems",
    pythonTools,
    state.team_members ?? ["PythonExpert"],
  );
  const pythonAgent = createReactAgent({
    llm: Pythonllm,
    tools: pythonTools,
    stateModifier,
  });

  return runAgentNode({ state, agent: pythonAgent, name: "PythonExpert" })
    .then((result) => ({
      ...result,
      // store only the lightweight analysis summary
      analysisSummary: result.messages[0].content,
    }));
};
