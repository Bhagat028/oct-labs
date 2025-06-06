import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { DynamicStructuredTool, StructuredTool } from '@langchain/core/tools';
import { jsonSchemaToZod, JsonSchema } from '@n8n/json-schema-to-zod';
import { UnknownKeysParam, z, ZodObject, ZodTypeAny } from 'zod';

// Simple Logger implementation
const LOG_COLORS = {
  RESET: '\x1b[0m',
  ERROR: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[32m',
  TRACE: '\x1b[35m',
  TOOL_RESULT: '\x1b[34m',
  TOOL_FAILURE: '\x1b[31m',
};

class Logger {
  private level: string;
  
  constructor(options: { level?: string } = {}) {
    this.level = options.level || 'info';
  }
  
  error(...args: any[]) {
    console.error(`${LOG_COLORS.ERROR}[ERROR]${LOG_COLORS.RESET}`, ...args);
  }
  
  warn(...args: any[]) {
    console.warn(`${LOG_COLORS.WARN}[WARN]${LOG_COLORS.RESET}`, ...args);
  }
  
  info(...args: any[]) {
    console.info(`${LOG_COLORS.INFO}[INFO]${LOG_COLORS.RESET}`, ...args);
  }
  
  debug(...args: any[]) {
    if (this.level === 'debug' || this.level === 'trace') {
      console.debug(`${LOG_COLORS.DEBUG}[DEBUG]${LOG_COLORS.RESET}`, ...args);
    }
  }
  
  trace(...args: any[]) {
    if (this.level === 'trace') {
      console.debug(`${LOG_COLORS.TRACE}[TRACE]${LOG_COLORS.RESET}`, ...args);
    }
  }
}

// Base configuration types for MCP servers
interface McpServerConfig {
  command: string;
  args: readonly string[];
  env?: Readonly<Record<string, string>>;
}

export interface McpServersConfig {
  [key: string]: McpServerConfig;
}

interface LogOptions {
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

interface McpError extends Error {
  serverName: string;
  details?: unknown;
}

export interface McpServerCleanupFn {
  (): Promise<void>;
}

// Custom error type for MCP server initialization failures
class McpInitializationError extends Error implements McpError {
  constructor(
    public serverName: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'McpInitializationError';
  }
}

/**
 * Initializes multiple MCP (Model Context Protocol) servers and converts them into LangChain tools.
 * This function concurrently sets up all specified servers and aggregates their tools.
 *
 * @param configs - A mapping of server names to their respective configurations
 * @param options - Optional logging configuration
 *
 * @returns A promise that resolves to:
 *          - tools: Array of StructuredTool instances ready for use with LangChain
 *          - cleanup: Function to properly terminate all server connections
 *
 * @throws McpInitializationError if any server fails to initialize
 *
 * @example
 * const { tools, cleanup } = await convertMcpToLangchainTools({
 *   filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '.'] },
 *   fetch: { command: 'uvx', args: ['mcp-server-fetch'] }
 * });
 */
export async function convertMcpToLangchainTools(
  configs: McpServersConfig,
  options?: LogOptions
): Promise<{
  tools: StructuredTool[];
  cleanup: McpServerCleanupFn;
}> {
  const allTools: StructuredTool[] = [];
  const cleanupCallbacks: McpServerCleanupFn[] = [];
  const logger = new Logger({ level: options?.logLevel || 'info' });

  const serverInitPromises = Object.entries(configs).map(async ([name, config]) => {
    const result = await convertSingleMcpToLangchainTools(name, config, logger);
    return { name, result };
  });

  // Track server names alongside their promises
  const serverNames = Object.keys(configs);

  // Concurrently initialize all the MCP servers
  const results = await Promise.allSettled(
    serverInitPromises
  );

  // Process successful initializations and log failures
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { result: { tools, cleanup } } = result.value;
      allTools.push(...tools);
      cleanupCallbacks.push(cleanup);
    } else {
      logger.error(`MCP server "${serverNames[index]}": failed to initialize: ${result.reason.details}`);
      throw result.reason;
    }
  });

   async function cleanup(): Promise<void> {    // Concurrently execute all the callbacks
    const results = await Promise.allSettled(cleanupCallbacks.map(callback => callback()));

    // Log any cleanup failures
    const failures = results.filter(result => result.status === 'rejected');
    failures.forEach((failure, index) => {
      logger.error(`MCP server "${serverNames[index]}": failed to close: ${failure.reason}`);
    });
  }

  logger.info(`MCP servers initialized: ${allTools.length} tool(s) available in total`);
  allTools.forEach((tool) => logger.debug(`- ${tool.name}`));

  return { tools: allTools, cleanup };
}

/**
 * Initializes a single MCP server and converts its capabilities into LangChain tools.
 * Sets up a connection to the server, retrieves available tools, and creates corresponding
 * LangChain tool instances.
 *
 * @param serverName - Unique identifier for the server instance
 * @param config - Server configuration including command, arguments, and environment variables
 * @param logger - Logger instance for recording operation details
 *
 * @returns A promise that resolves to:
 *          - tools: Array of StructuredTool instances from this server
 *          - cleanup: Function to properly terminate the server connection
 *
 * @throws McpInitializationError if server initialization fails
 *         (includes connection errors, tool listing failures)
 *
 * @internal This function is meant to be called by convertMcpToLangchainTools
 */
async function convertSingleMcpToLangchainTools(
  serverName: string,
  config: McpServerConfig,
  logger: Logger
): Promise<{
  tools: StructuredTool[];
  cleanup: McpServerCleanupFn;
}> {
  let transport: StdioClientTransport | null = null;
  let client: Client | null = null;

  logger.info(`MCP server "${serverName}": initializing with: ${JSON.stringify(config)}`);

  // NOTE: Some servers (e.g. Brave) seem to require PATH to be set.
  // To avoid confusion, it was decided to automatically append it to the env
  // if not explicitly set by the config.
  const env = { ...config.env };
  if (!env.PATH) {
    env.PATH = process.env.PATH || '';
  }

  try {
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args as string[],
      env: env,
    });

    client = new Client(
      {
        name: "mcp-client",
        version: "0.0.1",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    logger.info(`MCP server "${serverName}": connected`);

    const toolsResponse = await client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );

    const tools = toolsResponse.tools.map((tool) => (
      new DynamicStructuredTool({
        name: tool.name,
        description: tool.description || '',
        // FIXME
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: jsonSchemaToZod(tool.inputSchema as JsonSchema) as z.ZodObject<any>,

        func: async function(input) {
          logger.info(`MCP tool "${serverName}"/"${tool.name}" received input:`, input);

          try {
            // Execute tool call
            const result = await client?.request(
              {
                method: "tools/call",
                params: {
                  name: tool.name,
                  arguments: input,
                },
              },
              CallToolResultSchema
            );

            // Handles null/undefined cases gracefully
            if (!result?.content) {
              logger.info(`MCP tool "${serverName}"/"${tool.name}" received null/undefined result`);
              return '';
            }

            const textContent = result.content
              .filter(content => content.type === 'text')
              .map(content => content.text)
              .join('\n\n');
            // const textItems = result.content
            //   .filter(content => content.type === 'text')
            //   .map(content => content.text)
            // const textContent = JSON.stringify(textItems);

            // Log rough result size for monitoring
            const size = new TextEncoder().encode(textContent).length
            logger.info(`MCP tool "${serverName}"/"${tool.name}" received result (size: ${size})`);

            // If no text content, return a clear message describing the situation
            return textContent || 'No text content available in response';

          } catch (error: unknown) {
            console.log(`${LOG_COLORS.TOOL_FAILURE}MCP tool "${serverName}"/"${tool.name}" failed: ${error}${LOG_COLORS.RESET}`);
            logger.warn(`MCP tool "${serverName}"/"${tool.name}" caused error: ${error}`);
            return `Error executing MCP tool: ${error}`;
          }
        },
      })
    ));

    // Add a new tool for reading resources
    const readResourceTool = new DynamicStructuredTool({
      name: "read_resource",
      description: "Read a resource from the MCP server",
      schema: z.object({
        resourceUri: z.string().describe("The URI of the resource to read"),
      }),
      func: async function({ resourceUri }) {
        logger.info(`Reading resource: ${resourceUri}`);

        try {
          const resource = await client?.readResource({ uri: resourceUri });
          
          if (!resource || !resource.contents) {
            return "No content available for this resource.";
          }

          // Combine all text content from the resource
          const textContent = resource.contents
            .filter(content => typeof content.text === 'string')
            .map(content => content.text)
            .join('\n\n');

          return textContent || "Resource read successfully, but no text content available.";
        } catch (error) {
          logger.warn(`Error reading resource ${resourceUri}: ${error}`);
          return `Error reading resource: ${error}`;
        }
      },
    });

    // Check if a tool with the name "read_resource" already exists
    const existingToolIndex = tools.findIndex(tool => tool.name === "read_resource");

    if (existingToolIndex === -1) {
      tools.push(readResourceTool as unknown as DynamicStructuredTool<ZodObject<any, UnknownKeysParam, ZodTypeAny, { [x: string]: any; }, { [x: string]: any; }>>);
    } else {
      logger.warn(`Tool with name "read_resource" already exists. Skipping addition.`);
    }

    logger.info(`MCP server "${serverName}": ${tools.length} tool(s) available:`);
    tools.forEach((tool) => logger.info(`- ${tool.name}`));

    async function cleanup(): Promise<void> {
      if (transport) {
        await transport.close();
        logger.info(`MCP server "${serverName}": session closed`);
      }
    }

    return { tools, cleanup };
  } catch (error: unknown) {
    // Proper cleanup in case of initialization error
    if (transport) {
      try {
        await transport.close();
      } catch (cleanupError) {
        // Log cleanup error but don't let it override the original error
        logger.error(`Failed to cleanup during initialization error: ${cleanupError}`);
      }
    }
    throw new McpInitializationError(
      serverName,
      `Failed to initialize MCP server: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

