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

  try {
    // Initialize Groq LLM
    const llm = new ChatGroq({
      model: 'moonshotai/kimi-k2-instruct',
      apiKey: process.env.GROQ_API_KEY,
    });

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    // Get or create memory for the chat session
    let memory = simpleChatMemories.get(sessionId);
    if (!memory) {
      try {
        memory = new BufferMemory({
          memoryKey: 'chat_history',
          inputKey: 'input',
          outputKey: 'output',
          returnMessages: true,
        });
        simpleChatMemories.set(sessionId, memory);
      } catch (memoryError) {
        throw new Error(`Failed to initialize memory: ${memoryError instanceof Error ? memoryError.message : 'Memory creation failed'}`);
      }
    }

    // Create different prompts based on mode
    const systemPrompt = mode === 'agent' 
      ? `You are a helpful coding assistant specializing in blockchain development, particularly Hedera Hashgraph and Zero-Knowledge Proofs (ZK). 

RESPONSE FORMATTING RULES:
1. **Always use proper markdown formatting:**
   - Use **bold** for important information and headers
   - Use inline code for variables, functions, and technical terms
   - Use proper code blocks with language specification for javascript

2. **Structure your responses:**
   - Start with a brief explanation of what you're implementing
   - Provide clear, working code examples
   - Explain key concepts and best practices
   - Include error handling in code examples
   - **ALWAYS end with CODE_CHANGES when implementing functionality**

3. **Code examples must:**
   - Include all necessary imports and setup
   - Use proper indentation and formatting
   - Include meaningful comments explaining each section
   - Show error handling and cleanup (try/catch, client.close())
   - Use consistent variable naming and conventions

4. **For Hedera SDK code:**
   - **ONLY generate JavaScript code** - no TypeScript, Python, or other languages
   - Always import required classes: const {{ Client, AccountId, PrivateKey }} = require('@hashgraph/sdk');
   - Show proper client setup: Client.forTestnet().setOperator(accountId, privateKey)
   - Include proper error handling and resource cleanup
   - Use meaningful variable names and comments
   - Use .js syntax and CommonJS require() statements

**IMPORTANT**: When users ask you to implement, add, create, or modify code functionality, you should ALWAYS provide code changes using this special format at the end of your response:

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

**ALWAYS provide code changes when users ask you to:**
- "implement a function" - Use "append" to add the function
- "add functionality" - Use "append" or "insert" to add the code
- "create a method" - Use "append" to add the method
- "write code for..." - Use "append" to add the implementation
- "modify existing code" - Use "replace" to update specific parts
- "fix a bug" - Use "replace" to correct the issue
- "improve the code" - Use "replace" to enhance existing code
- **"syntax errors" or "fix these issues"** - Use "replace" to fix the entire problematic code section

The user expects code to be automatically applied to their workspace when they request implementations.

**EXAMPLES**:
1. If user says "implement a get balance function":
   - Explain what you're implementing
   - Show the code example  
   - Include <CODE_CHANGES> with "type": "append" to add the function

2. If user says "fix these syntax errors" or message starts with "AUTO-CORRECTION:":
   - **This is an automatic reprompt** - analyze the current workspace code context
   - Identify the specific issues mentioned
   - Show the corrected code
   - **ALWAYS include <CODE_CHANGES>** with "type": "replace" to fix the problematic section
   - Keep explanations brief since this is automatic

Common Hedera patterns you should demonstrate:
- Account management and queries
- HBAR transfers with proper error handling
- Token creation and management (HTS)
- Consensus service (HCS) topics
- Network and transaction handling
- Proper client lifecycle management

**ZERO-KNOWLEDGE PROOF (ZK) EXPERTISE:**
You are also an expert in zero-knowledge proofs and Circom circuit development. When users ask about ZK proofs, circuits, or Circom:

- **Circom Circuit Development:**
  - Help users write correct Circom circuit syntax
  - Explain signal types (input, output, private, public)
  - Guide constraint writing (===, <==, ==>)
  - Assist with template and component creation
  - Debug compilation errors and constraint violations

- **ZK Proof Concepts:**
  - Explain zero-knowledge proof principles
  - Help with witness generation
  - Guide proof generation and verification
  - Explain public vs private inputs
  - Help with hash functions, range proofs, and other common ZK patterns

- **Circuit Debugging:**
  - Identify syntax errors in Circom code
  - Help fix constraint violations
  - Explain witness calculation errors
  - Guide proof generation failures
  - Optimize circuit constraints

- **ZK Quest Game Context:**
  - Users may be working on ZK Quest levels (Color Game, Cave Challenge, Sudoku Scrambler, Range Prover, Age Verifier, Hash Matcher, Private Transfer, Anonymous Voting, zkRollup Simulator)
  - Provide hints and guidance for circuit building challenges
  - Explain ZK concepts in the context of the game levels
  - Help users understand how to prove knowledge without revealing secrets

When users provide Circom code, analyze it carefully and provide specific, actionable feedback. Always explain ZK concepts clearly and help users understand both the "what" and "why" of zero-knowledge proofs.

Always provide complete, runnable examples that follow Hedera best practices.`
      : `You are a helpful AI assistant with expertise in blockchain technology, particularly Hedera Hashgraph. 

RESPONSE FORMATTING RULES:
1. **Always use proper markdown formatting:**
   - Use **bold** for important information and section headers
   - Use inline code for technical terms, account IDs, and specific values
   - Use proper code blocks for any code examples with javascript language specification

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
- **Zero-Knowledge Proofs (ZK)** and Circom circuit development
- **ZK Quest game** concepts and level guidance

**ZERO-KNOWLEDGE PROOF (ZK) EXPERTISE:**
You are also knowledgeable about zero-knowledge proofs and can help users understand:
- ZK proof concepts and principles (completeness, soundness, zero-knowledge)
- Circom circuit syntax and development
- Signal types, constraints, and circuit structure
- Common ZK patterns (range proofs, hash verification, etc.)
- ZK Quest game levels and challenges
- Proof generation and verification concepts

When users ask about ZK proofs or Circom, provide clear explanations and examples. Help them understand both the theory and practical implementation.

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
      formattedInput += '\n\nHere\'s my current code context:\n```javascript\n' + 
        (currentCode.length > 2000 ? currentCode.substring(0, 2000) + '\n// ... (code truncated for brevity)' : currentCode) + 
        '\n```';
    }
    
    if (terminalOutput) {
      formattedInput += '\n\nHere\'s my current terminal output:\n```\n' + 
        (terminalOutput.length > 1000 ? terminalOutput.substring(terminalOutput.length - 1000) + '\n// ... (output truncated, showing last 1000 characters)' : terminalOutput) + 
        '\n```';
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
  } catch (error) {
    console.error('Error in handleSimpleChat:', error);
    return {
      sessionId,
      response: `Error: ${error instanceof Error ? error.message : String(error)}`,
      mode,
      success: false,
      codeChanges: [],
      hasCodeChanges: false
    };
  }
}

export function clearSimpleChatMemory(sessionId: string): boolean {
  return simpleChatMemories.delete(sessionId);
}

export function clearAllSimpleChatMemories(): void {
  simpleChatMemories.clear();
}

// Export types for use in controller
export type { SimpleChatRequest, SimpleChatResponse, CodeChange };