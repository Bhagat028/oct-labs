// lib/researchGraph.ts
import { chatllm } from "./model"; // adjust your import paths as needed
import { createDeepseekSupervisor } from "./supervisor";
import { StateGraph, END, START } from "@langchain/langgraph";
import { ResearchTeamState } from "./ResearchTeamState";
import { pgNode, pythonNode } from "./ResearchTeamState";

export async function createResearchGraph() {
  // Create the supervisor agent with your configured prompt and team members
  const supervisorAgent = await createDeepseekSupervisor(
    chatllm,
    "You are a supervisor coordinating a team of specialized experts: {team_members}. Your job is CRITICAL." +
      "\n\nEXPERT SELECTION RULES:" +
      "\n1. DatabaseExpert - ALWAYS SELECT FOR:" +
      "\n   -  run read-only PostgreSQL (using query )" +
      "\n   - ANY task involving  retrieval from databases" +
      "\n" +
      "\n2. PythonExpert - ALWAYS SELECT FOR:" +
      "\n   - Running Python code (using execute_code)" +
      "\n   - Data analysis or computation" +
      "\n   - Accessing resources (using read_resource)" +
      "\n   - ANY task requiring coding or computation" +
      "\n" +
      "\nCRITICAL: You MUST use BOTH experts appropriately. Never assign database tasks to PythonExpert.",
    ["PythonExpert", "DatabaseExpert"]
  );

  // Build the state graph with your research nodes and supervisor
  const researchGraph = new StateGraph(ResearchTeamState)
    .addNode("DatabaseExpert", pgNode)
    .addNode("supervisor", supervisorAgent)
    .addNode("PythonExpert", pythonNode)
    // Define the control flow between nodes
    .addEdge("DatabaseExpert", "supervisor")
    .addEdge("PythonExpert", "supervisor")
    .addConditionalEdges("supervisor", (x) => x.next, {
      DatabaseExpert: "DatabaseExpert",
      PythonExpert: "PythonExpert",
      FINISH: END,
    })
    .addEdge(START, "supervisor");

  return researchGraph.compile();
}
