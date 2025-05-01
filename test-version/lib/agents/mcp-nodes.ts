// Correct the import path based on your project structure and aliases.
// If @/lib is configured for your project's 'lib' directory:
import { getUserStoredUrl } from '@/lib/db-utils'; // <-- Using alias

// If this file is in the same directory as get-db-url.ts:
// import { getDbUrl } from './get-db-url';

// If this file is in a subdirectory (e.g., lib/tools) and get-db-url.ts is in lib:
// import { getDbUrl } from '../get-db-url';


// Correct the import path for convertMcpToLangchainTools based on its location
// Assuming it's in the same directory for now:
import { convertMcpToLangchainTools } from './langchain-mcp-tools';


// Maximum retry attempts for fetching the database URL
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Define base MCP server configurations (will not be mutated)
const baseMcpServers = {
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
      // Database URL will be added dynamically to a *copy* of this config
    ],
  }
};

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the type for the cleanup functions
interface CleanupFunctions {
  pgCleanup?: () => Promise<void>; // Make properties optional in case one initialization fails
  pythonCleanup?: () => Promise<void>;
}

// Initialize each MCP server separately to get distinct tool sets
export const initializeTools = async () => {
  let dbUrl: string | null = null; // Explicitly type dbUrl
  let attempts = 0;
  let lastError: any = null;

  console.log("Attempting to fetch database URL with retries...");

  // Try to fetch the database URL with retries
  while (attempts < MAX_RETRIES) {
    try {
      console.log(`Attempt ${attempts + 1}/${MAX_RETRIES}...`);
      // Use the correctly imported function name getDbUrl
      dbUrl = await getUserStoredUrl(); // <-- Correct function call

      // If getDbUrl succeeds, it returns the URL, so we can break
      console.log(`Successfully fetched URL on attempt ${attempts + 1}`);
      break;

    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed with error:`, error);
      lastError = error; // Store the last error
      attempts++;

      // Only wait if this wasn't the last attempt
      if (attempts < MAX_RETRIES) {
        await wait(RETRY_DELAY);
      }
    }
  }

  // If we still don't have a URL after all retries, throw a clear error
  if (!dbUrl) {
    const errorMessage = `Failed to fetch database URL after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(errorMessage);
    // Re-throw the last encountered error if available, or a new generic one
    throw lastError || new Error(errorMessage);
  }

  // Successfully fetched database URL, now prepare configs and initialize tools
  console.log("Successfully fetched database URL, initializing MCP tools...");

  // Create a copy of the Postgres config and add the fetched URL
  const postgresConfigWithUrl = {
      ...baseMcpServers.Postgres, // Copy existing properties
      args: [...baseMcpServers.Postgres.args, dbUrl] // Create new args array with URL
  };

  try {
    // Initialize tools with the confirmed URL for Postgres, and base config for Python
    // Note: These seem to run in parallel, which is fine if convertMcpToLangchainTools is independent
    const [pgToolsResult, pythonToolsResult] = await Promise.all([
        convertMcpToLangchainTools({ Postgres: postgresConfigWithUrl }), // Use the config with URL
        convertMcpToLangchainTools({ python: baseMcpServers.python }) // Use base Python config
    ]);

    console.log("Successfully initialized MCP tools");

    // Return tools and cleanup functions
    return {
      pgTools: pgToolsResult.tools,
      pgCleanup: pgToolsResult.cleanup,
      pythonTools: pythonToolsResult.tools,
      pythonCleanup: pythonToolsResult.cleanup
    };
  } catch (error) {
    console.error("Error during MCP tools initialization:", error);
    // It's important to potentially run cleanup here if partial initialization happened,
    // but convertMcpToLangchainTools would need to be structured to return partial cleanups on error.
    // For now, we just re-throw.
    throw error; // Re-throw initialization error
  }
};

// Combined cleanup function that handles both servers
export const mcpCleanup = async (cleanupFunctions: CleanupFunctions) => {
  console.log("Running MCP cleanup...");
  // Ensure cleanup functions exist before calling and handle potential errors during cleanup
  const cleanupPromises: Promise<void>[] = [];

  if (cleanupFunctions.pgCleanup) {
      console.log("Running Postgres cleanup...");
      cleanupPromises.push(cleanupFunctions.pgCleanup().catch(e => console.error("Error during Postgres cleanup:", e)));
  } else {
      console.warn("No Postgres cleanup function provided.");
  }

  if (cleanupFunctions.pythonCleanup) {
      console.log("Running Python cleanup...");
      cleanupPromises.push(cleanupFunctions.pythonCleanup().catch(e => console.error("Error during Python cleanup:", e)));
  } else {
       console.warn("No Python cleanup function provided.");
  }

  await Promise.all(cleanupPromises);
  console.log("MCP cleanup finished.");
};

// Export CleanupFunctions type if it's used externally
export type { CleanupFunctions };