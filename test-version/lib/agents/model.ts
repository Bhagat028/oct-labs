import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";

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