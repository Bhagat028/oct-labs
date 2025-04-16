
import {
    convertMcpToLangchainTools,
    McpServersConfig,
    McpServerCleanupFn
  } from './langchain-mcp-tools';
  
// Define separate MCP server configurations
const mcpServers = {
    python: {
      command: "docker",
      args: [
        "run",
        "-i",
        "--rm",
        "bhagatsurya/python-repl-node:latest"
      ],
    },
     Postgres: {
            command: 'docker',
            args: [
              "run", "-i", "--rm", 
              "mcp/postgres", 
              "postgresql://postgres.nbnebrveqyaufcysnwje:chatdashdeo@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
            ],
          }
  
  };
  
  // Initialize each MCP server separately to get distinct tool sets
  const pythonToolsResult = await convertMcpToLangchainTools({ python: mcpServers.python });
  const pgToolsResult = await convertMcpToLangchainTools({ Postgres: mcpServers.Postgres });
  
  // Extract tools and cleanup functions
  export const pythonTools = pythonToolsResult.tools;
  export const pythonCleanup = pythonToolsResult.cleanup;
  
  export const pgTools = pgToolsResult.tools;
  export const pgCleanup = pgToolsResult.cleanup;
  
  // Combined cleanup function that handles both servers
  export const mcpCleanup = async () => {
    await Promise.all([pythonCleanup(), pgCleanup()]);
  };