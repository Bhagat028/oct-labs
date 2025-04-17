import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
const groq_api_key = "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";
const superviourllm = new ChatOpenAI({
    modelName: 'openai/gpt-4.1',
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

// const SQLllm = new ChatGroq({
//   model: "llama-3.3-70b-versatile",
//   temperature: 0.2,
//   maxTokens: undefined,
//   maxRetries: 2,
//   apiKey: groq_api_key,
//   // other params...
// });

// const Pythonllm = new ChatGroq({
//   model: "llama-3.3-70b-versatile",
//   temperature: 0.2,
//   maxTokens: undefined,
//   maxRetries: 2,
//   apiKey: groq_api_key,
//   // other params..
// });


  const  SQLllm = new ChatOpenAI({
    modelName: 'meta-llama/llama-3.3-70b-instruct',
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

  const Pythonllm = new ChatOpenAI({
    modelName: 'meta-llama/llama-3.3-70b-instruct',
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

  export { superviourllm, SQLllm, Pythonllm };