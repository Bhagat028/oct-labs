import OpenAI from 'openai';
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

// dotenv.config();
// console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY);

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
  defaultHeaders: {
    "HTTP-Referer": "https://oct.ai", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "Oct", // Optional. Site title for rankings on openrouter.ai.
  },
});

export async function getAIResponse(message: string) {
  const completion = await openai.chat.completions.create({
    model: "meta-llama/llama-4-scout:free",
    messages: [
      {
        "role": "user",
        "content": message
      }
    ],
    
  });

  return completion.choices[0].message;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    console.log('Received message:', message); // Log the incoming message

    const aiResponse = await getAIResponse(message);
    console.log('AI Response:', aiResponse); // Log the AI response

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Error in /api/ai:', error); // Log any errors
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
}

