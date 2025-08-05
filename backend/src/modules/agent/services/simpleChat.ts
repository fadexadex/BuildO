import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BufferMemory } from 'langchain/memory';
import * as dotenv from 'dotenv';
dotenv.config();

// Store simple chat conversation memories by session ID
const simpleChatMemories = new Map<string, BufferMemory>();

interface SimpleChatRequest {
  sessionId: string;
  message: string;
  mode?: 'ask' | 'agent'; // ask = general questions, agent = code-focused
  currentCode?: string; // Current code context for agent mode
}

interface CodeChange {
  type: 'replace' | 'insert' | 'append' | 'prepend' | 'delete';
  description: string;
  code: string;
  oldCode?: string; // For showing what's being replaced/deleted
  lineRange?: { start: number; end: number }; // For replace/delete operations
  position?: number; // For insert operations
  preview?: {
    before: string; // Lines before the change for context
    after: string;  // Lines after the change for context
  };
}

interface SimpleChatResponse {
  sessionId: string;
  response: string;
  mode: string;
  success: boolean;
  codeChanges?: CodeChange[]; // Auto-applicable code changes
  hasCodeChanges?: boolean; // Quick check for frontend
}

export async function handleSimpleChat(request: SimpleChatRequest): Promise<SimpleChatResponse> {
  const { sessionId, message, mode = 'ask', currentCode } = request;


  // Validate required fields
  if (!sessionId || !message) {
    throw new Error('Missing required fields: sessionId, message');
  }

  // Initialize Groq LLM
  const llm = new ChatGroq({
    model: 'moonshotai/kimi-k2-instruct',
    apiKey: process.env.GROQ_API_KEY,
  });

  // Get or create memory for the chat session
  let memory = simpleChatMemories.get(sessionId);
  if (!memory) {
    memory = new BufferMemory({
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'output',
      returnMessages: true,
    });
    simpleChatMemories.set(sessionId, memory);
  }

  // Create different prompts based on mode
  const systemPrompt = mode === 'agent' 
    ? `You are a helpful coding assistant specializing in blockchain development, particularly Hedera Hashgraph. 

When users ask questions:
- Provide clear, practical code examples
- Focus on Hedera SDK implementations in JavaScript/TypeScript
- Include best practices and error handling
- Explain concepts with working code snippets
- Be concise but thorough in explanations

When you want to make changes to code, use this special format at the end of your response:

<CODE_CHANGES>
[
  {{
    "type": "replace|insert|append|prepend|delete",
    "description": "What this change does",
    "code": "the new code to add",
    "oldCode": "the original code being replaced (for replace/delete only)",
    "lineRange": {{"start": 5, "end": 10}},
    "position": 15,
    "preview": {{
      "before": "// context lines before change",
      "after": "// context lines after change"
    }}
  }}
]
</CODE_CHANGES>

Code change types:
- "replace": Replace specific lines (needs lineRange, oldCode, and code)
- "insert": Insert at specific position (needs position and code)
- "append": Add to end of file (needs code)
- "prepend": Add to beginning of file (needs code)
- "delete": Remove specific lines (needs lineRange and oldCode)

For replace/delete operations, always include:
- "oldCode": The exact code being replaced/removed
- "lineRange": The line numbers being affected
- "preview": A few lines before/after for context

Only suggest code changes when the user specifically asks for modifications, improvements, or fixes to their existing code.

Common Hedera patterns you should know:
- Account management and queries
- HBAR transfers
- Token creation and management (HTS)
- Consensus service (HCS) topics
- Smart contracts (if applicable)
- File service operations
- Network and transaction handling

Always format code examples in proper JavaScript/TypeScript syntax with:
\`\`\`javascript
// Your code here
\`\`\`

Include proper error handling and explain what each part does.`
    : `You are a helpful AI assistant. Answer questions clearly and concisely. 

You can help with:
- General questions and explanations
- Technical concepts and definitions
- Programming guidance and best practices
- Problem solving approaches
- Learning and education topics
- Hedera blockchain concepts (without code execution)

Be friendly, informative, and helpful in your responses. If users ask for code examples, provide them but explain that you cannot execute code directly.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}']
  ]);

  // Get chat history from memory
  const chatHistory = await memory.chatHistory.getMessages();
  
  // Format the input message with code context if provided (regardless of mode)
  const formattedInput = currentCode
    ? `${message}

Here's my current code context:
\`\`\`javascript
${currentCode.length > 2000 ? currentCode.substring(0, 2000) + '\n// ... (code truncated for brevity)' : currentCode}
\`\`\``
    : message;

  console.log('Formatted input:', formattedInput);
  
  // Format the prompt with history and input
  const formattedPrompt = await prompt.formatMessages({
    chat_history: chatHistory,
    input: formattedInput
  });

  console.log('Formatted prompt:', formattedPrompt);

  // Get response from LLM
  const response = await llm.invoke(formattedPrompt);
  const responseContent = response.content as string;

  // Parse code changes if present
  let codeChanges: CodeChange[] = [];
  let cleanResponse = responseContent;
  
  if (mode === 'agent' && currentCode) {
    const codeChangesMatch = responseContent.match(/<CODE_CHANGES>([\s\S]*?)<\/CODE_CHANGES>/);
    if (codeChangesMatch) {
      try {
        const codeChangesJson = codeChangesMatch[1].trim();
        codeChanges = JSON.parse(codeChangesJson);
        // Remove the CODE_CHANGES block from the response
        cleanResponse = responseContent.replace(/<CODE_CHANGES>[\s\S]*?<\/CODE_CHANGES>/, '').trim();
      } catch (error) {
        console.warn('Failed to parse code changes:', error);
        // Continue without code changes if parsing fails
      }
    }
  }

  // Save the conversation to memory (save the clean response without CODE_CHANGES block)
  await memory.saveContext(
    { input: message },
    { output: cleanResponse }
  );

  return {
    sessionId,
    response: cleanResponse,
    mode,
    success: true,
    codeChanges: codeChanges.length > 0 ? codeChanges : undefined,
    hasCodeChanges: codeChanges.length > 0
  };
}

export function clearSimpleChatMemory(sessionId: string): boolean {
  return simpleChatMemories.delete(sessionId);
}

export function clearAllSimpleChatMemories(): void {
  simpleChatMemories.clear();
}

// Export types for use in controller
export type { SimpleChatRequest, SimpleChatResponse, CodeChange };