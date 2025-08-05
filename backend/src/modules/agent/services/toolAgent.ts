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

  // Initialize Groq LLM
  const llm = new ChatGroq({
    model: 'moonshotai/kimi-k2-instruct',
    apiKey: process.env.GROQ_API_KEY,
  });

  // Hedera client setup with provided credentials
  const client = Client.forTestnet().setOperator(
    accountId,
    PrivateKey.fromStringECDSA(privateKey),
  );

  // Get or create memory for the session
  let memory = toolAgentMemories.get(sessionId);
  if (!memory) {
    memory = new BufferMemory({
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'output',
      returnMessages: true,
    });
    toolAgentMemories.set(sessionId, memory);
  }

  // Loading all available tools automatically via empty array
  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      tools: [], // Empty array loads ALL available tools
      context: {
        mode: AgentMode.AUTONOMOUS,
      },
    },
  });

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

For any successful operations, provide ONLY the HashScan operations link:
- Account Operations: https://hashscan.io/testnet/account/[ACCOUNT_ID]/operations

Keep responses concise - just confirm success and provide the operations link.

Always use tools when possible rather than providing instructions.`],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  // Fetch tools from toolkit
  // cast to any to avoid excessively deep type instantiation caused by zod@3.25
  const tools = hederaAgentToolkit.getTools();

  // Create the underlying agent
  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  // Wrap everything in an executor that will maintain memory
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    memory,
    returnIntermediateSteps: false,
  });

  // Process the message
  const response = await agentExecutor.invoke({ input: message });

  console.log(response);

  return {
    sessionId,
    response: response?.output ?? response,
    success: true
  };
}

export function clearToolAgentMemory(sessionId: string): boolean {
  return toolAgentMemories.delete(sessionId);
}

export function clearAllToolAgentMemories(): void {
  toolAgentMemories.clear();
}