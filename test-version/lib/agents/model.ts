import { ChatOpenAI } from "@langchain/openai";
// import { ChatGroq } from "@langchain/groq";
// import { ChatCerebras } from "@langchain/cerebras";
// const cerebras_api_key = "csk-j54r63jt99m6rw43evwtv9ek3wr2pwtcndhh9h585fettw4m"
// const groq_api_key = "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";
const superviourllm = new ChatOpenAI({
    modelName: 'openai/gpt-4.1',
    temperature: 0.2,
    maxTokens: 500,
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


// const cerebrasllm = new ChatCerebras({
//   apiKey: cerebras_api_key,
//   model: "llama-3.3-70b",
//   temperature: 0.2,
//   maxTokens: 1000,
//   maxRetries: 2,
//   // other params...
// });

  const  SQLllm = new ChatOpenAI({
    modelName: 'anthropic/claude-3.5-sonnet:beta',
    temperature: 0.2,
    maxTokens: 1000,
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
    modelName: 'deepseek/deepseek-chat-v3-0324',
    temperature: 0.2,
    maxTokens: 1000,
    openAIApiKey: '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',
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Refererd": "https://dashchat.xyz/",
        "X-Title": "MCP Integration App"
      },
    },
  });
  const draftllm = new ChatOpenAI({
    modelName: 'deepseek/deepseek-chat-v3-0324',
    temperature: 0.2,
    
    maxTokens: 1000,
    openAIApiKey: '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',
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Refererd": "https://dashchat.xyz/",
        "X-Title": "MCP Integration App"
      },
    },
  });


  export { superviourllm, SQLllm, Pythonllm, draftllm };