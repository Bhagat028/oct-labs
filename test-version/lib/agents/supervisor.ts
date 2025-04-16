import { z } from "zod";
import { HumanMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { JsonOutputToolsParser } from "langchain/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from "@langchain/core/runnables";
import { StructuredToolInterface } from "@langchain/core/tools";
import { MessagesAnnotation } from "@langchain/langgraph";

/**
 * Creates a state modifier function for agent nodes
 */
export const agentStateModifier = (
  systemPrompt: string,
  tools: StructuredToolInterface[],
  teamMembers: string[],
): ((state: typeof MessagesAnnotation.State) => BaseMessage[]) => {
  // Format tool descriptions safely without accessing schema properties directly
  const toolDescriptions = tools.map((t) => {
    let schemaStr = "";
    try {
      // Safe approach that doesn't rely on shape property
      if (t.schema) {
        // For Zod schemas, don't try to access shape directly
        schemaStr = `Input parameters: ${t.schema.description || "See tool documentation"}`;
      }
    } catch (e) {
      schemaStr = "Schema details unavailable";
    }
    
    return `- ${t.name}: ${t.description}\n      ${schemaStr}`;
  }).join("\n\n");
  
  const systemMsgStart = new SystemMessage(
    `${systemPrompt}\n\n` +
    `YOU ARE THE ${teamMembers[0]}. Work autonomously using your specialized tools.\n` +
    `AVAILABLE TOOLS:\n${toolDescriptions}\n\n` +
    `IMPORTANT: To use a tool, format your response EXACTLY like this example:\n` +
    `<tool>\n{\n  "name": "tool_name",\n  "input": {\n    "param": "value"\n  }\n}\n</tool>\n\n` +
    `After using a tool, you'll receive results to use in your next step.` +
    `Your team members will handle their own specialized tasks.`
  );
  
  const systemMsgEnd = new SystemMessage(
    `CRITICAL REMINDERS:\n` +
    `1. You are the ${teamMembers[0]}\n` +
    `2. You can ONLY use these specific tools: ${tools.map(t => t.name).join(", ")}\n` +
    `3. ALWAYS use the exact tool format shown above\n` +
    `4. Complete your assigned task thoroughly before concluding\n` +
    `5. Clearly explain what you accomplished`
  );

  return (state: typeof MessagesAnnotation.State): BaseMessage[] => 
    [systemMsgStart, ...state.messages, systemMsgEnd];
};

/**
 * Executes an agent with role-specific instructions
 */
export async function runAgentNode(params: {
  state: any;
  agent: Runnable;
  name: string;
}): Promise<{
  messages: BaseMessage[];
  agent_used: string;
}> {
  const { state, agent, name } = params;
  
  // Add role-specific instructions to help with tool selection
  let rolePrompt: SystemMessage | null = null;
  if (name === "DatabaseExpert") {
    rolePrompt = new SystemMessage(
      "You are the DatabaseExpert. DATABASE OPERATIONS ONLY.\n" +
      "Your primary tools are: read_query\n" +
      "Example tool usage:\n" +
      "<tool>\n{\n  \"name\": \"read_query\",\n  \"input\": {\n    \"query\": \"SELECT * FROM users LIMIT 5\"\n  }\n}\n</tool>"
    );
  } else if (name === "PythonExpert") {
    rolePrompt = new SystemMessage(
      "You are the PythonExpert. CODE EXECUTION ONLY.\n" +
      "Your primary tools are: execute_code, read_resource.\n" +
      "Example tool usage:\n" +
      "<tool>\n{\n  \"name\": \"execute_code\",\n  \"input\": {\n    \"code\": \"print('Hello world')\"\n  }\n}\n</tool>"
    );
  }
  
  // Include role-specific context in messages
  const augmentedMessages = rolePrompt 
    ? [rolePrompt, ...state.messages] 
    : state.messages;
  
  try {
    // Run agent with extended timeout for Deepseek models
    const result = await agent.invoke({
      messages: augmentedMessages,
      timeout: 60000 // Longer timeout for Deepseek
    });
    
    const lastMessage = result.messages[result.messages.length - 1];
    
    // Track which agent was used for balancing in supervisor
    return {
      messages: [new HumanMessage({ 
        content: `[${name}] ${lastMessage.content}`, 
        name
      })],
      agent_used: name
    };
  } catch (error) {
    console.error(`Error in ${name} agent:`, error);
    // Provide a fallback response if tool calling fails
    return {
      messages: [new HumanMessage({ 
        content: `As ${name}, I encountered an issue with tool execution. I recommend trying a different approach or passing to another team member.`, 
        name 
      })],
      agent_used: name
    };
  }
}

/**
 * Creates a supervisor agent that coordinates between team members
 */
/**
 * Creates a supervisor compatible with Deepseek models
 */
export async function createDeepseekSupervisor(
  llm: ChatOpenAI,
  systemPrompt: string,
  members: string[],
): Promise<Runnable> {
  const options = ["FINISH", ...members];
  
  // Create a prompt that explicitly asks for a structured response
  const deepseekSupervisorPrompt = 
    `${systemPrompt}\n\n` +
    `TEAM MEMBER SELECTION RULES:\n` +
    `1. DatabaseExpert: MUST BE SELECTED for ALL database operations including:\n` +
    `   - run read-only PostgreSQL queries (query) +\n\n` +
    `2. PythonExpert: MUST BE SELECTED for ALL code execution including:\n` +
    `   - Running Python code (execute_code)\n` +
    `   - Processing data with Python (execute_code)\n` +
    `   - Accessing resources (read_resource)\n\n` +
    `CRITICAL: You must use BOTH experts appropriately.\n\n` +
    `YOUR RESPONSE MUST BE IN THIS EXACT FORMAT:\n` +
    `REASONING: [your detailed reasoning]\n` +
    `NEXT: [one of: ${options.join(", ")}]\n` +
    `INSTRUCTIONS: [specific instructions for the selected team member]`;
    
  let prompt = ChatPromptTemplate.fromMessages([
    ["system", deepseekSupervisorPrompt],
    new MessagesPlaceholder("messages"),
    [
      "system",
      "After reviewing the conversation, select the next team member or FINISH.\n" +
      "Available options: {options}\n\n" + 
      "YOUR RESPONSE FORMAT MUST BE EXACTLY:\n" +
      "REASONING: [your reasoning]\n" +
      "NEXT: [expert name or FINISH]\n" +
      "INSTRUCTIONS: [specific instructions]"
    ],
  ]);
  
  prompt = await prompt.partial({
    options: options.join(", "),
    team_members: members.join(", "),
  });

  // Custom parser for the structured format
  const customOutputParser = (text: string) => {
    try {
      const nextMatch = text.match(/NEXT:\s*([\s\S]*?)(?=INSTRUCTIONS:|$)/);
      const instructionsMatch = text.match(/INSTRUCTIONS:\s*([\s\S]*?)(?=$)/);
      
      if (!nextMatch || !nextMatch[1]) {
        console.warn("Failed to parse supervisor response:", text);
        return {
          next: "DatabaseExpert", // Default
          instructions: "Please help with database operations.",
        };
      }
      
      const next = nextMatch[1].trim();
      const instructions = instructionsMatch && instructionsMatch[1] 
        ? instructionsMatch[1].trim() 
        : "Please proceed with your expertise.";
      
      // Validate next value
      if (!options.includes(next)) {
        return {
          next: "DatabaseExpert",
          instructions,
        };
      }
      
      return {
        next,
        instructions,
      };
    } catch (error) {
      console.error("Error parsing supervisor response:", error);
      return {
        next: "DatabaseExpert",
        instructions: "Please help with database operations.",
      };
    }
  };

  // Create a chain with the custom parser
  const supervisor = prompt
    .pipe(llm)
    .pipe((response) => {
      const content = response.content.toString();
      return customOutputParser(content);
    });

  return supervisor;
}
