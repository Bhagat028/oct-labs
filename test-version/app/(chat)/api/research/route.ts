// app/(chat)/api/research/route.ts

import { HumanMessage } from "@langchain/core/messages";
import { createResearchGraph } from "@/lib/agents/index"; // adjust your path accordingly
import { createClient } from '@/utils/supabase/Server'; // Import the server-side Supabase client

export async function POST(req: Request) {
  // Set CORS headers for potential preflight requests or responses
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust this based on your frontend's origin in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // --- Explicit Authentication Check ---
    // This ensures createClient (and cookies) is called during a request
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("Authentication failed for /api/research:", error);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    console.log(`Authenticated user: ${user.id}`);
    // --- End Authentication Check ---


    // Parse and log the request body for debugging.
    const body = await req.json().catch(() => ({}));
    console.log("Request body:", body);

    // If the key might have extra whitespace, find the key that equals "question" after trimming.
    let question: string | undefined;
    for (const key in body) {
      if (key.trim() === "question") {
        question = body[key];
        break;
      }
    }

    // Use a fallback question if none is provided.
    const inputQuestion =
      (question && typeof question === "string" && question.trim()) ||
      "tell how you can help me with my problem";

    console.log("Input question:", inputQuestion);

    // Create the research chain using your helper.
    // IMPORTANT: The implementation of createResearchGraph (and any functions it calls,
    // like initializeTools) MUST ensure that request-dependent operations
    // (like calling createClient/cookies) are only executed *when this function is called*,
    // not during module evaluation/import time.
    const researchChain = await createResearchGraph();

    // Start the chain stream with the human message.
    const streamResults = researchChain.stream(
      {
        messages: [new HumanMessage(inputQuestion)],
      },
      { recursionLimit: 100 }
    );

    let lastContent: string | null = null;

    // Process the streamed outputs with enhanced error handling.
    for await (const output of await streamResults) {
      console.log("Stream output:", JSON.stringify(output, null, 2));

      // Wrap the property access in a try-catch to log any errors in the output processing.
      try {
        if (!output?.__end__) {
          if (output?.PythonExpert?.messages?.[0]?.content) {
            lastContent = output.PythonExpert.messages[0].content;
          } else if (output?.DatabaseExpert?.messages?.[0]?.content) {
            lastContent = output.DatabaseExpert.messages[0].content;
          } else if (output?.DataSummarizer?.messages?.[0]?.content) {
            lastContent = output.DataSummarizer.messages[0].content;
          }

          if (output?.supervisor?.next === "FINISH") {
            break;
          }
        }

      } catch (innerError) {
        console.error("Error processing stream output:", output, innerError);
      }
    }

    console.log("Raw final result content:", lastContent);

    // Remove agent labels (e.g., [DatabaseExpert|PythonExpert]) from the final content.
    let cleanResult = lastContent;
    if (cleanResult) {
      cleanResult = cleanResult.replace(/\[(DatabaseExpert|PythonExpert)\]\s*/g, "").trim();
    }

    console.log("Cleaned final result content:", cleanResult);

    // Return the cleaned final result as JSON.
    return new Response(JSON.stringify({ result: cleanResult }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing research chain:", error);
    return new Response(
      JSON.stringify({ error: "Error processing request" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
}

// Add an OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Adjust based on your frontend's origin
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(null, { status: 204, headers });
}
