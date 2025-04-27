import { convertMcpToLangchainTools } from './langchain-mcp-tools';
import { fetchDatabaseUrl } from '../db-utils';

// Maximum retry attempts for fetching the database URL
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

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
      "mcp/postgres"
      // Database URL will be added dynamically
    ],
  }
};

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize each MCP server separately to get distinct tool sets
export const initializeTools = async () => {
  let dbUrl = null;
  let attempts = 0;
  let lastError = null;
  
  // Try to fetch the database URL with retries
  while (attempts < MAX_RETRIES && !dbUrl) {
    try {
      console.log(`Attempt ${attempts + 1}/${MAX_RETRIES} to fetch database URL`);
      dbUrl = await fetchDatabaseUrl();
      
      if (!dbUrl) {
        console.log(`Attempt ${attempts + 1} failed - no URL returned`);
        lastError = new Error("No URL returned from API");
        
        // Wait before next attempt
        if (attempts < MAX_RETRIES - 1) {
          await wait(RETRY_DELAY);
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed with error:`, error);
      lastError = error;
      
      // Wait before next attempt
      if (attempts < MAX_RETRIES - 1) {
        await wait(RETRY_DELAY);
      }
    }
    
    attempts++;
  }
  
  // If we still don't have a URL after all retries, throw a clear error
  if (!dbUrl) {
    const errorMessage = `Failed to fetch database URL after ${MAX_RETRIES} attempts. Check API route, session data, and server configuration.`;
    console.error(errorMessage, lastError);
    throw new Error(errorMessage);
  }
  
  // Add the successfully fetched database URL
  console.log("Successfully fetched database URL, initializing Postgres MCP");
  mcpServers.Postgres.args.push(dbUrl);
  
  try {
    // Initialize tools with the confirmed URL
    const pgToolsResult = await convertMcpToLangchainTools({ Postgres: mcpServers.Postgres });
    const pythonToolsResult = await convertMcpToLangchainTools({ python: mcpServers.python });  
    
    console.log("Successfully initialized MCP tools");
    
    // Extract tools and cleanup functions
    return {
      pgTools: pgToolsResult.tools,
      pgCleanup: pgToolsResult.cleanup,
      pythonTools: pythonToolsResult.tools,
      pythonCleanup: pythonToolsResult.cleanup
    };
  } catch (error) {
    console.error("Error during MCP tools initialization:", error);
    throw error;
  }
};

// Combined cleanup function that handles both servers
export const mcpCleanup = async (cleanupFunctions: CleanupFunctions) => {
  await cleanupFunctions.pgCleanup();
  await cleanupFunctions.pythonCleanup();
};

// Define the type for the cleanup functions
interface CleanupFunctions {
  pgCleanup: () => Promise<void>;
  pythonCleanup: () => Promise<void>;
}