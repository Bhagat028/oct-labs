// lib/researchGraph.ts
import { superviourllm } from "./model"; // adjust your import paths as needed
import { createTeamSupervisor } from "./supervisor";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ResearchTeamState } from "./ResearchTeamState";
import { pgNode, pythonNode, summaryNode,  } from "./ResearchTeamState";

export async function createResearchGraph() {
  // Create the supervisor agent with your configured prompt and team members
  const supervisorAgent = await createTeamSupervisor(
    superviourllm,
   "You are a supervisor tasked with managing a conversation between the" +
      " following workers:  {team_members}. Given the following user request," +
      " respond with the worker to act next. Each worker will perform a" +
      " task and respond  with their results and status. When finished," +
      " respond with FINISH.\n\n" +
      "Give clear instructions in points and choose strategically to minimize steps.",
    ["DatabaseExpert", "PythonExpert","DataSummarizer", ],
  );
  
  // Build the state graph with your research nodes and supervisor
  const researchGraph = new StateGraph(ResearchTeamState)
    .addNode("DatabaseExpert", pgNode)
    .addNode("supervisor", supervisorAgent)
    .addNode("PythonExpert", pythonNode)
    .addNode("DataSummarizer", summaryNode)
    // Define the control flow between nodes
    .addEdge("DatabaseExpert", "supervisor")
    .addEdge("PythonExpert", "supervisor")
    .addConditionalEdges("supervisor", (x) => x.next, {
      DatabaseExpert: "DatabaseExpert",
      PythonExpert: "PythonExpert",
      DataSummarizer: "DataSummarizer",
      FINISH: END,
    })
    .addEdge(START, "supervisor");

  return researchGraph.compile();
}