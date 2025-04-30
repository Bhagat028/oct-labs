import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { agentStateModifier } from "./supervisor";
import { SQLllm, Pythonllm, draftllm } from "./model";
import { runAgentNode } from "./supervisor";
import { initializeTools } from "./mcp-nodes";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";

// Initialize tools
let pgTools: any = [];
let pythonTools: any = [];
let cleanup = { pgCleanup: async () => {}, pythonCleanup: async () => {} };

// Initialize the tools immediately
(async () => {
  const tools = await initializeTools();
  pgTools = tools.pgTools;
  pythonTools = tools.pythonTools;
  cleanup = {
    pgCleanup: tools.pgCleanup,
    pythonCleanup: tools.pythonCleanup
  };
})().catch(error => {
  console.error("Failed to initialize tools:", error);
});

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

const databaseContext = `{
    "tables": [
        {
            "table_name": "employees",
            "description": "The employees table stores information about individual employees within an organization, including their personal details, job position, department, and employment status.",
            "columns": [
                {
                    "column_name": "id",
                    "description": "A unique identifier for each employee, used as a reference point for other tables and to distinguish between employees.",
                    "data_type": "bigint",
                    "nullable": false
                },
                {
                    "column_name": "name",
                    "description": "The full name of the employee, including first and last names.",
                    "data_type": "text",
                    "nullable": false
                },
                {
                    "column_name": "email",
                    "description": "The employee's email address, used for communication and potentially as a login credential.",
                    "data_type": "text",
                    "nullable": false
                },
                {
                    "column_name": "phone_number",
                    "description": "The employee's phone number, including area code, used for contact purposes.",
                    "data_type": "text",
                    "nullable": false
                },
                {
                    "column_name": "position",
                    "description": "The employee's job title or position within the organization, describing their role and responsibilities.",
                    "data_type": "text",
                    "nullable": false
                },
                {
                    "column_name": "department",
                    "description": "The department or team the employee belongs to, used for organizational and reporting purposes.",
                    "data_type": "text",
                    "nullable": false
                },
                {
                    "column_name": "hire_date",
                    "description": "The date and time the employee was hired, used to track tenure and eligibility for benefits.",
                    "data_type": "timestamp with time zone",
                    "nullable": false
                },
                {
                    "column_name": "salary",
                    "description": "The employee's annual salary, used for payroll and compensation purposes.",
                    "data_type": "numeric",
                    "nullable": false
                },
                {
                    "column_name": "status",
                    "description": "The employee's current employment status, such as active, inactive, or on leave, used to determine access to resources and benefits.",
                    "data_type": "text",
                    "nullable": false
                }
            ]
        }
    ]
}`

export const pgNode = (state: typeof ResearchTeamState.State) => {
  const stateModifier = agentStateModifier(
    "You are a database expert who can use CTE query PostgreSQL databases for information\n"
    + `databse schema: ${databaseContext}`,
    pgTools,
    state.team_members ?? ["DatabaseExpert"]
  );
  
  const pgAgent = createReactAgent({
    llm: SQLllm,
    tools: pgTools,
    stateModifier,
  });
  
  return runAgentNode({ state, agent: pgAgent, name: "DatabaseExpert" });
};



  // export const complexpgNode = async (state: typeof ResearchTeamState.State): Promise<typeof ResearchTeamState.State> => {
  //   const stateModifier = agentStateModifier(
  //     "You are a database expert who can for complex that need python analysis  queries on PostgreSQL databases for information.\n" + 
  //     "Always: 1. Check information_schema.columns once and cache. 2. Return results as JSON: { \"sql\": \"...\", \"row_count\": <int>, \"rows\": [...] } this to anylize the data properly with python ",
  //     pgTools,
  //     state.team_members ?? ["ComplexDatabaseExpert"],
  //   )
  //   const complexpgAgent = createReactAgent({
  //     llm: SQLllm,
  //     tools: pgTools,
  //     stateModifier,
  //   })
  //   const result = await runAgentNode({ state, agent: complexpgAgent, name: "ComplexDatabaseExpert" });
  //   return { ...state, ...result };
  // };



  // export const pgNodecomplex = (state: typeof ResearchTeamState.State) => {
  //   const stateModifier = agentStateModifier(
  //     `You are a database expert who can for complex that need python analysis  queries on PostgreSQL databases for information.
  //     -retive the database schema then analyze the data 
  //     return the result Json format: {sql:"sql query", rows:[{column1:value1, column2:value2, ...}] }`,
  //     pgTools,
  //     state.team_members ?? ["DatabaseExpertcomplex"],
  //   )
  //   const pgAgent = createReactAgent({
  //     llm: SQLllm,
  //     tools: pgTools,
  //     stateModifier,
  //   })
  //   return runAgentNode({ state, agent: pgAgent, name: "DatabaseExpertcomplex" });
  // };


  export const pythonNode = (state: typeof ResearchTeamState.State) => {
    const stateModifier = agentStateModifier(
      "You are a Statistical  expert who can execute Python code to analyze data and solve problems",
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
  
  

  // Create a summary node that processes the state after Python execution
export const summaryNode = async (state: typeof ResearchTeamState.State) => {
  // Create a system message for the summarization task
  const systemMessage = new SystemMessage(
    "You are a data summarization expert. Review all the information and analysis results. Break down the data as if you're explaining it to a non-technical person, when appropriate emojis. Do not add \n\n**Summary:**\n in text format."
  );
  
  // Create a prompt template that includes all messages from the state
  const summaryPrompt = ChatPromptTemplate.fromMessages([
    systemMessage,
    new MessagesPlaceholder("messages"),
  ]);
  
  // Execute the LLM to generate the summary
  const result = await summaryPrompt.pipe(draftllm).invoke({
    messages: state.messages,
  });
  
  // Return the summary as a message from the "DataSummarizer"
  return {
    messages: [new HumanMessage({ content: result.content, name: "DataSummarizer" })],
  };
};

