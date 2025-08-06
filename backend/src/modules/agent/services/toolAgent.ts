import { HederaLangchainToolkit, AgentMode } from 'hedera-agent-kit';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { BufferMemory } from 'langchain/memory';
import { Client, PrivateKey } from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

// Store tool agent conversation memories by session ID
const toolAgentMemories = new Map<string, BufferMemory>();

interface ToolAgentRequest {
  sessionId: string;
  accountId: string;
  privateKey: string;
  message: string;
}

export async function chatWithToolAgent(request: ToolAgentRequest) {
  const { sessionId, accountId, privateKey, message } = request;

  // Validate required fields
  if (!sessionId || !accountId || !privateKey || !message) {
    throw new Error('Missing required fields: sessionId, accountId, privateKey, message');
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

    // Hedera client setup with provided credentials
    let client;
    try {
      client = Client.forTestnet().setOperator(
        accountId,
        PrivateKey.fromStringECDSA(privateKey),
      );
    } catch (clientError) {
      throw new Error(`Failed to initialize Hedera client: ${clientError instanceof Error ? clientError.message : 'Invalid credentials'}`);
    }

    // Get or create memory for the session
    let memory = toolAgentMemories.get(sessionId);
    if (!memory) {
      try {
        memory = new BufferMemory({
          memoryKey: 'chat_history',
          inputKey: 'input',
          outputKey: 'output',
          returnMessages: true,
        });
        toolAgentMemories.set(sessionId, memory);
      } catch (memoryError) {
        throw new Error(`Failed to initialize memory: ${memoryError instanceof Error ? memoryError.message : 'Memory creation failed'}`);
      }
    }

    // Loading all available tools automatically via empty array
    let hederaAgentToolkit;
    try {
      hederaAgentToolkit = new HederaLangchainToolkit({
        client,
        configuration: {
          tools: [], // Empty array loads ALL available tools
          context: {
            mode: AgentMode.AUTONOMOUS,
          },
        },
      });
    } catch (toolkitError) {
      throw new Error(`Failed to initialize Hedera toolkit: ${toolkitError instanceof Error ? toolkitError.message : 'Toolkit initialization failed'}`);
    }

    // Load the structured chat prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a Hedera blockchain assistant with access to tools that can execute real operations on the Hedera testnet. 

When users ask you to perform Hedera operations, USE THE AVAILABLE TOOLS to execute them directly.

AVAILABLE TOOLS:
**HTS (Token Service) Tools:**
- CREATE_FUNGIBLE_TOKEN_TOOL - Create fungible tokens
- CREATE_NON_FUNGIBLE_TOKEN_TOOL - Create NFT collections
- AIRDROP_FUNGIBLE_TOKEN_TOOL - Airdrop fungible tokens to accounts
- MINT_FUNGIBLE_TOKEN_TOOL - Mint additional fungible tokens
- MINT_NON_FUNGIBLE_TOKEN_TOOL - Mint NFTs

**Account Tools:**
- TRANSFER_HBAR_TOOL - Transfer HBAR between accounts

**Consensus Service Tools:**
- CREATE_TOPIC_TOOL - Create consensus topics
- SUBMIT_TOPIC_MESSAGE_TOOL - Submit messages to topics

**Query Tools:**
- GET_HBAR_BALANCE_QUERY_TOOL - Get HBAR balance for accounts
- GET_ACCOUNT_QUERY_TOOL - Get account information
- GET_ACCOUNT_TOKEN_BALANCES_QUERY_TOOL - Get token balances for accounts
- GET_TOPIC_MESSAGES_QUERY_TOOL - Get messages from topics

RESPONSE FORMATTING RULES:
1. **Always use proper markdown formatting:**
   - Use **bold** for important information
   - Use inline code for account IDs, amounts, and technical terms
   - Use code blocks with language specification for code examples

2. **Structure your responses:**
   - Start with a brief confirmation of what you're doing
   - Show the operation details clearly
   - Provide the HashScan link for successful operations
   - Use bullet points for multiple items

3. **For successful operations, provide:**
   - **Operation**: Brief description of what was done
   - **Account**: The account used (use account.id format)
   - **HashScan Link**: https://hashscan.io/testnet/account/[ACCOUNT_ID]/operations

4. **Code examples should:**
   - **ONLY generate JavaScript code** - no TypeScript, Python, or other languages
   - Include proper imports and setup
   - Show error handling
   - Use consistent formatting and indentation
   - Include helpful comments

5. **For "Add to Workspace" functionality:**
   - When users want to add code to workspace, assume they have a base template with main() function
   - Provide code that can be intelligently merged into existing structure
   - Focus on the functional logic, not the boilerplate setup
   - Use clear function names and proper error handling
   - Assume client setup and imports are already present

Keep responses concise but informative. Always use tools when possible rather than providing instructions.`],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    // Fetch tools from toolkit
    // cast to any to avoid excessively deep type instantiation caused by zod@3.25
    let tools;
    try {
      tools = hederaAgentToolkit.getTools();
    } catch (toolsError) {
      throw new Error(`Failed to get tools: ${toolsError instanceof Error ? toolsError.message : 'Tools initialization failed'}`);
    }

    // Create the underlying agent
    let agent;
    try {
      agent = createToolCallingAgent({
        llm,
        tools,
        prompt,
      });
    } catch (agentError) {
      throw new Error(`Failed to create agent: ${agentError instanceof Error ? agentError.message : 'Agent creation failed'}`);
    }

    // Wrap everything in an executor that will maintain memory
    let agentExecutor;
    try {
      agentExecutor = new AgentExecutor({
        agent,
        tools,
        memory,
        returnIntermediateSteps: false,
      });
    } catch (executorError) {
      throw new Error(`Failed to create agent executor: ${executorError instanceof Error ? executorError.message : 'Executor creation failed'}`);
    }

    // Process the message
    let response;
    try {
      response = await agentExecutor.invoke({ input: message });
    } catch (invocationError) {
      throw new Error(`Agent invocation failed: ${invocationError instanceof Error ? invocationError.message : 'Processing failed'}`);
    }

    console.log(response);

    return {
      sessionId,
      response: response?.output ?? response,
      success: true
    };
  } catch (error) {
    console.error('Error in chatWithToolAgent:', error);
    return {
      sessionId,
      response: `Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export function clearToolAgentMemory(sessionId: string): boolean {
  return toolAgentMemories.delete(sessionId);
}

export function clearAllToolAgentMemories(): void {
  toolAgentMemories.clear();
}