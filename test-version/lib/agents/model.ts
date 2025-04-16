import { ChatOpenAI } from "@langchain/openai";
// Initialize LLMs
const chatllm = new ChatOpenAI({
    modelName: 'openrouter/optimus-alpha',
    temperature: 0.2,
    openAIApiKey: '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',
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Refererd": "https://dashchat.xyz/",
        "X-Title": "MCP Integration App"
      },
    },
  });

  const supervisorllm = new ChatOpenAI({
    modelName: 'qwen/qwen-2.5-72b-instruct',
    temperature: 0.3,
    openAIApiKey: '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',
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Refererd": "https://dashchat.xyz/",
        "X-Title": "MCP Integration App"
      },
    },
  });

  export { chatllm,supervisorllm };