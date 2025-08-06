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
  terminalOutput?: string; // Terminal output context
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
  const { sessionId, message, mode = 'ask', currentCode, terminalOutput } = request;


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

RESPONSE FORMATTING RULES:
1. **Always use proper markdown formatting:**
   - Use **bold** for important information and headers
   - Use \`inline code\` for variables, functions, and technical terms
   - Use proper code blocks with language specification:
   \`\`\`javascript
   // Always include helpful comments
   const example = "properly formatted code";
   \`\`\`

2. **Structure your responses:**
   - Start with a brief explanation of what you're addressing
   - Provide clear, working code examples
   - Explain key concepts and best practices
   - Include error handling in code examples

3. **Code examples must:**
   - Include all necessary imports and setup
   - Use proper indentation and formatting
   - Include meaningful comments explaining each section
   - Show error handling and cleanup (try/catch, client.close())
   - Use consistent variable naming and conventions

4. **For Hedera SDK code:**
   - Always import required classes: \`const { Client, AccountId, PrivateKey } = require('@hashgraph/sdk');\`
   - Show proper client setup: \`Client.forTestnet().setOperator(accountId, privateKey)\`
   - Include proper error handling and resource cleanup
   - Use meaningful variable names and comments

When you want to make changes to existing code, use this special format at the end of your response:

<CODE_CHANGES>
[
  {{
    "type": "replace|insert|append|prepend|delete",
    "description": "Clear description of what this change does",
    "code": "the new code to add (properly formatted)",
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

Common Hedera patterns you should demonstrate:
- Account management and queries
- HBAR transfers with proper error handling
- Token creation and management (HTS)
- Consensus service (HCS) topics
- Network and transaction handling
- Proper client lifecycle management

Always provide complete, runnable examples that follow Hedera best practices.`
    : `You are a helpful AI assistant with expertise in blockchain technology, particularly Hedera Hashgraph. 

RESPONSE FORMATTING RULES:
1. **Always use proper markdown formatting:**
   - Use **bold** for important information and section headers
   - Use \`inline code\` for technical terms, account IDs, and specific values
   - Use proper code blocks for any code examples:
   \`\`\`javascript
   // Include helpful comments in code examples
   const example = "well-formatted code";
   \`\`\`

2. **Structure your responses:**
   - Start with a clear, direct answer to the question
   - Provide detailed explanations with proper formatting
   - Use bullet points for lists and multiple concepts
   - Include practical examples when relevant

3. **For code examples:**
   - Always specify the language in code blocks
   - Include necessary imports and setup
   - Add meaningful comments explaining the code
   - Show proper error handling where applicable

You can help with:
- **General questions** and explanations about blockchain concepts
- **Technical concepts** and definitions related to Hedera
- **Programming guidance** and best practices
- **Problem solving approaches** for development challenges
- **Learning resources** and educational topics
- **Hedera blockchain concepts** (architecture, consensus, services)

Be friendly, informative, and thorough in your responses. When providing code examples, make them complete and properly formatted, but explain that you cannot execute code directly - users should test code in their development environment.

Focus on providing accurate, well-structured information that helps users understand both the concepts and practical implementation details.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['placeholder', '{chat_history}'],
    ['human', '{input}']
  ]);

  // Get chat history from memory
  const chatHistory = await memory.chatHistory.getMessages();
  
  // Format the input message with code and terminal context if provided
  let formattedInput = message;
  
  if (currentCode) {
    formattedInput += `

Here's my current code context:
\`\`\`javascript
${currentCode.length > 2000 ? currentCode.substring(0, 2000) + '\n// ... (code truncated for brevity)' : currentCode}
\`\`\``;
  }
  
  if (terminalOutput) {
    formattedInput += `

Here's my current terminal output:
\`\`\`
${terminalOutput.length > 1000 ? terminalOutput.substring(terminalOutput.length - 1000) + '\n// ... (output truncated, showing last 1000 characters)' : terminalOutput}
\`\`\``;
  }

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