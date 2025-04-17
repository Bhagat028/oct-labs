// app/(chat)/api/research/route.ts

import { HumanMessage } from "@langchain/core/messages";
import { createResearchGraph } from "@/lib/agents/index";

export async function POST(req: Request) {
  try {
    // 1) pull out the incoming question
    const body = await req.json().catch(() => ({}));
    let question: string | undefined;
    for (const key in body) {
      if (key.trim() === "question") {
        question = body[key];
        break;
      }
    }
    const inputQuestion =
      (typeof question === "string" && question.trim()) ||
      "How many employees are with the company for more than 4 years";

    // 2) build & kick off your research graph
    const researchChain = await createResearchGraph();
    const stream = researchChain.stream(
      { messages: [new HumanMessage(inputQuestion)] },
      { recursionLimit: 100 }
    );

    let dbResult: any = null;
    let analysisSummary: any = null;

    // 3) consume the stream & pick off the two pieces of state
    for await (const output of await stream) {
      if (output.DatabaseExpert?.dbResult) {
        dbResult = output.DatabaseExpert.dbResult;
      }
      if (output.PythonExpert?.analysisSummary) {
        analysisSummary = output.PythonExpert.analysisSummary;
      }
      if (output.supervisor?.next === "FINISH") {
        break;
      }
    }

    // 4) return just the two objects your UI cares about
    return new Response(
      JSON.stringify({ dbResult, analysisSummary }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing research chain:", error);
    return new Response(
      JSON.stringify({ error: "Error processing request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
