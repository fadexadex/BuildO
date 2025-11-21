import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as dotenv from 'dotenv';
import { SYSTEM_PROMPT } from './system-prompt.js';

dotenv.config();

interface CircuitAgentRequest {
  action: 'generate' | 'explain';
  prompt: string;
  code?: string;
}

const escapeForPromptTemplate = (text: string) =>
  text.replace(/[{]/g, '{{').replace(/[}]/g, '}}');

export async function handleCircuitDesign(request: CircuitAgentRequest) {
  const { action, prompt, code } = request;

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const llm = new ChatGroq({
    model: 'llama-3.3-70b-versatile', // Using Llama 3 for better coding capabilities
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.1,
  });

  let systemPrompt = '';
  let userMessage = '';

  if (action === 'generate') {
    systemPrompt = SYSTEM_PROMPT;
    
    userMessage = prompt;
  } else if (action === 'explain') {
    systemPrompt = `You are an expert Zero-Knowledge Circuit engineer.
    Your task is to explain the provided Circom circuit code, identify potential issues, or answer specific questions about it.
    
    Focus on:z
    1. Constraint logic and security.
    2. Potential under-constrained signals.
    3. Efficiency improvements.
    `;
    
    userMessage = `Code:\n\`\`\`circom\n${code}\n\`\`\`\n\nQuestion/Request: ${prompt}`;
  }

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', escapeForPromptTemplate(systemPrompt)],
    ['human', '{input}'],
  ]);

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());
  
  try {
    const result = await chain.invoke({ input: userMessage });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Circuit Agent Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

