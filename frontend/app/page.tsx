"use client"

import { useState, useEffect, useRef, useCallback, memo, startTransition, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Editor from '@monaco-editor/react'
import {
  Send,
  Wallet,
  Play,
  Code,
  Terminal,
  Trash2,
  Eye,
  EyeOff,
  X,
  User,
  Check,
  MessageCircle,
  Bot,
  Shield,
  Clock,
  Copy,
  Plus,
  Save,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AgentAPI, ChatRequest, CodeExecutionRequest, SimpleChatAPI, SimpleChatRequest, CodeChange } from "@/lib/api"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  status?: "pending" | "success" | "error"
  codeBlocks?: {
    language: string
    code: string
    title: string
  }[]
  isCodeProposal?: boolean
  isAccepted?: boolean
  transactionData?: {
    action: string
    details: string[]
    transactionHash?: string
    estimatedCost?: string // Add optional estimatedCost
  }
  codeChanges?: CodeChange[] // New field for code changes
  hasCodeChanges?: boolean // Quick check
  isApplyingChanges?: boolean // Animation state
  originalCode?: string // For rollback functionality
}

export default function BuildOPlayground() {
  const { toast } = useToast()
  const [mode, setMode] = useState<"agent" | "workspace">("agent")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [playgroundCode, setPlaygroundCode] = useState(`
// Hedera Account Balance Checker
const { Client, AccountId } = require('@hashgraph/sdk');

function checkBalance(accountString) {
  const account = AccountId.fromString(accountString);
  console.log('Checking balance for:', account.toString());
  return account;
}

// Example usage
const account = checkBalance('0.0.123');`)
  const [playgroundOutput, setPlaygroundOutput] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [balance, setBalance] = useState("127.45")
  const [credentialErrors, setCredentialErrors] = useState<{ accountId?: string; privateKey?: string }>({})

  // Workspace specific states
  const [workspaceMessages, setWorkspaceMessages] = useState<Message[]>([])
  const [workspaceInput, setWorkspaceInput] = useState("")
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [assistantMode, setAssistantMode] = useState<"ask" | "agent">("ask")

  // New states for codebase context and code application
  const [includeCodebaseContext, setIncludeCodebaseContext] = useState(true)
  const [includeTerminalContext, setIncludeTerminalContext] = useState(false)
  const [showContextOptions, setShowContextOptions] = useState(false)
  const [simpleChatSessionId, setSimpleChatSessionId] = useState<string>("")
  const [pendingCodeChanges, setPendingCodeChanges] = useState<{messageId: string, changes: CodeChange[], originalCode: string} | null>(null)
  
  // Monaco editor instance ref for error detection
  const monacoEditorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  
  // Input throttling states
  const [inputLocked, setInputLocked] = useState(false)
  const [workspaceInputLocked, setWorkspaceInputLocked] = useState(false)
  
  // Debounced input states to prevent rapid updates
  const [debouncedInputValue, setDebouncedInputValue] = useState("")
  const [debouncedWorkspaceInput, setDebouncedWorkspaceInput] = useState("")
  const inputDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const workspaceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Session management states
  const [agentSessionId, setAgentSessionId] = useState<string>("")
  const [workspaceSessionId, setWorkspaceSessionId] = useState<string>("")

  // Editor resize states
  const [editorHeight, setEditorHeight] = useState(400) // Default editor height in pixels
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartHeight, setDragStartHeight] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const workspaceMessagesEndRef = useRef<HTMLDivElement>(null)
  const currentCodeRef = useRef<string>(playgroundCode)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const contextOptionsRef = useRef<HTMLDivElement>(null)

  // Generate JavaScript template with user's credentials
  const generateJavaScriptTemplate = (accountId: string, privateKey: string) => {
    return `
const {
  AccountId,
  PrivateKey,
  Client
} = require("@hashgraph/sdk"); // v2.64.5

async function main() {
  let client;
  try {
    // Your account ID and private key from string value
    const MY_ACCOUNT_ID = AccountId.fromString("${accountId}");
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("${privateKey}");

    // Pre-configured client for test network (testnet)
    client = Client.forTestnet();

    // Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // Start your code here
    console.log("✅ Connected to Hedera Testnet");
    console.log("🏦 Account ID:", MY_ACCOUNT_ID.toString());
    
    // Example: Get account balance
    // const balance = await new AccountBalanceQuery()
    //   .setAccountId(MY_ACCOUNT_ID)
    //   .execute(client);
    // console.log("💰 Account balance:", balance.hbars.toString());
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    if (client) {
      client.close();
      console.log("🔌 Connection closed");
    }
  }
}

main();`;
  };

  // Format agent responses to clean up function calls and improve presentation
  // Function to detect syntax errors in Monaco editor
  const detectSyntaxErrors = useCallback(() => {
    if (!monacoRef.current || !monacoEditorRef.current) {
      return []
    }
    
    try {
      const model = monacoEditorRef.current.getModel()
      if (!model) return []
      
      const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
      const errors = markers.filter((marker: any) => marker.severity === monacoRef.current.MarkerSeverity.Error)
      
      return errors.map((error: any) => ({
        line: error.startLineNumber,
        column: error.startColumn,
        message: error.message,
        code: error.code,
        severity: 'error'
      }))
    } catch (error) {
      console.error('Error detecting syntax errors:', error)
      return []
    }
  }, [])

  // Function to trigger AI correction for syntax errors
  const triggerErrorCorrection = useCallback(async (errors: any[], codeWithErrors: string) => {
    if (errors.length === 0) return
    
    const errorDescriptions = errors.map(error => 
      `Line ${error.line}: ${error.message}`
    ).join('\n')
    
    const correctionPrompt = `AUTO-CORRECTION: The code you just applied has syntax errors. Please fix these issues and provide CODE_CHANGES:

ERRORS DETECTED:
${errorDescriptions}

This is an automatic reprompt - please analyze the current workspace code and provide corrected CODE_CHANGES to fix these syntax errors.`

    try {
      // Execute the correction request silently (no user message displayed)
      const responseMessage = await executeSimpleChatRequest(correctionPrompt)
      
      // Only add the AI response to messages (not the correction prompt)
      setWorkspaceMessages((prev) => [...prev, responseMessage])

      toast({
        title: "🔧 Auto-Correction Triggered",
        description: `Detected ${errors.length} syntax error(s) and requested AI to fix them.`,
        duration: 3000,
      })

    } catch (error) {
      console.error('Error triggering correction:', error)
      toast({
        title: "❌ Auto-Correction Failed",
        description: "Could not automatically request error correction.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [])

  const formatAgentResponse = useCallback((response: string) => {
    let cleaned = response;
    
    // Remove function call blocks (including the thinking blocks)
    cleaned = cleaned.replace(/<anythingllm:thinking>[\s\S]*?<\/anythingllm:thinking>/g, '');
    cleaned = cleaned.replace(/<anythingllm:function_calls>[\s\S]*?<\/anythingllm:function_calls>/g, '');
    cleaned = cleaned.replace(/<anythingllm:function_calls_result>[\s\S]*?<\/anythingllm:function_calls_result>/g, '');
    
    // Clean up multiple consecutive newlines
    cleaned = cleaned.replace(/\n\n+/g, '\n\n').trim();
    
    // Enhance HBAR balance formatting
    cleaned = cleaned.replace(/(\*\*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s+HBAR(\*\*)?/g, (match, prefix, amount, suffix) => {
      return `💰 **${amount} HBAR**`;
    });
    
    // Enhance success checkmarks
    cleaned = cleaned.replace(/✅/g, '✅');
    
    // Make account IDs more prominent
    cleaned = cleaned.replace(/(account\s+)(0\.0\.\d+)/gi, '$1**$2**');
    
    return cleaned;
  }, []);

  // Enhanced code block component
  const CodeBlock = memo(({ code, language = 'javascript', messageId, showAddToWorkspace = true }: { code: string, language?: string, messageId: string, showAddToWorkspace?: boolean }) => {
    const codeId = `code-${messageId}-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="code-block-container my-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="code-block-header flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{language}</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => copyCodeBlock(codeId)} 
              className="inline-flex items-center px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded-md transition-all duration-200 border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow"
              title="Copy to clipboard"
            >
              <Copy className="w-3 h-3 mr-1.5" />
              Copy
            </button>
            {showAddToWorkspace && (
            <button 
              onClick={() => addCodeToWorkspace(codeId)} 
              className="inline-flex items-center px-3 py-1.5 text-xs bg-black hover:bg-gray-800 text-white rounded-md transition-all duration-200 shadow-sm hover:shadow"
              title="Add to workspace"
            >
              Add to Workspace
              <svg className="w-3 h-3 ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 17L17 7M17 7H10M17 7V14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            )}
          </div>
        </div>
        <pre className="code-block-content bg-slate-900 text-slate-100 p-4 overflow-x-auto text-sm leading-relaxed" id={codeId}>
          <code className={`language-${language}`}>{code.trim()}</code>
        </pre>
      </div>
    );
  });

  // Message content component that properly renders code blocks
  const MessageContent = memo(({ content, messageId }: { content: string, messageId: string }) => {
    // Memoize the parsing to prevent recalculation on every render
    const { parsedContent, codeBlocks } = useMemo(() => {
      // Parse the content and extract code blocks
      const blocks: Array<{ id: string, code: string, language: string }> = [];
      
      let processedContent = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        const lang = language || 'javascript';
        const blockId = `codeblock-${blocks.length}`;
        blocks.push({ id: blockId, code, language: lang });
        return `<div id="${blockId}" data-code-block="true"></div>`;
      });

      // Handle other markdown
      processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">$1</code>');
      processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      processedContent = processedContent.replace(/^• (.+)$/gm, '<li class="ml-4 text-slate-700">$1</li>');
      processedContent = processedContent.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside space-y-0.5 my-1">$1</ul>');
      processedContent = processedContent.replace(/\n/g, '<br/>');

      return { parsedContent: processedContent, codeBlocks: blocks };
    }, [content]); // Only recalculate when content changes

    return (
      <div className="text-xs leading-relaxed">
        <div dangerouslySetInnerHTML={{ __html: parsedContent }} />
        {codeBlocks.map((block, index) => (
          <CodeBlock 
            key={`${messageId}-${index}`}
            code={block.code} 
            language={block.language} 
            messageId={`${messageId}-${index}`} 
            showAddToWorkspace={mode === "agent"}
          />
        ))}
      </div>
    );
  });

  // Parse markdown-style formatting for message display with enhanced code block support
  const parseMarkdown = (text: string, messageId?: string) => {
    // Store code blocks to render as React components
    const codeBlocks: Array<{ id: string, code: string, language: string }> = [];
    
    // Handle code blocks with language and action buttons
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const lang = language || 'javascript';
      const blockId = `codeblock-${codeBlocks.length}`;
      codeBlocks.push({ id: blockId, code, language: lang });
      return `<div id="${blockId}" data-code-block="true"></div>`;
    });

    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">$1</code>');
    
    // Handle **bold** text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Handle bullet points
    text = text.replace(/^• (.+)$/gm, '<li class="ml-4 text-slate-700">$1</li>');
    text = text.replace(/(<li.*<\/li>)/g, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br/>');
    
    // Store code blocks for rendering
    if (messageId && codeBlocks.length > 0) {
      (window as any).codeBlocks = (window as any).codeBlocks || {};
      (window as any).codeBlocks[messageId] = codeBlocks;
    }
    
    return text;
  };

  // Only scroll when new messages are actually added, with debouncing
  const prevMessagesLength = useRef(messages.length);
  const prevWorkspaceMessagesLength = useRef(workspaceMessages.length);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Debounce the scroll to prevent multiple rapid scrolls
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]) // Only depend on length, not full messages array

  useEffect(() => {
    if (workspaceMessages.length > prevWorkspaceMessagesLength.current) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Debounce the scroll to prevent multiple rapid scrolls
      scrollTimeoutRef.current = setTimeout(() => {
        workspaceMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevWorkspaceMessagesLength.current = workspaceMessages.length;
  }, [workspaceMessages.length]) // Only depend on length, not full messages array

  // Auto-scroll to latest message when switching tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === "agent" && messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (mode === "workspace" && workspaceMessages.length > 0) {
        workspaceMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100); // Small delay to ensure the tab content is rendered

    return () => clearTimeout(timer);
  }, [mode]) // Trigger when mode changes

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAccountId = sessionStorage.getItem("hedera_account_id")
      const savedPrivateKey = sessionStorage.getItem("hedera_private_key")
      const savedAgentSessionId = sessionStorage.getItem("agent_session_id")
      const savedWorkspaceSessionId = sessionStorage.getItem("workspace_session_id")
      const savedSimpleChatSessionId = sessionStorage.getItem("simple_chat_session_id")
      const savedEditorHeight = localStorage.getItem("editor_height")

      if (savedAccountId && savedPrivateKey) {
        setAccountId(savedAccountId)
        setPrivateKey(savedPrivateKey)
      setIsConnected(true)
    }

      if (savedAgentSessionId) {
        setAgentSessionId(savedAgentSessionId)
      }

      if (savedWorkspaceSessionId) {
        setWorkspaceSessionId(savedWorkspaceSessionId)
      }

      if (savedSimpleChatSessionId) {
        setSimpleChatSessionId(savedSimpleChatSessionId)
      }

      if (savedEditorHeight) {
        const height = parseInt(savedEditorHeight, 10)
        if (height >= 200 && height <= 800) {
          setEditorHeight(height)
        }
      }
    }
  }, [])

  // Save editor height to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("editor_height", editorHeight.toString())
    }
  }, [editorHeight])

  // Handle clicking outside context options panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextOptionsRef.current && !contextOptionsRef.current.contains(event.target as Node)) {
        setShowContextOptions(false)
      }
    }

    if (showContextOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showContextOptions])

  useEffect(() => {
    if (isConnected) {
      // Initialize playground with JavaScript template
      if (accountId && privateKey) {
        setPlaygroundCode(generateJavaScriptTemplate(accountId, privateKey));
        setSelectedLanguage("javascript");
      }

      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: `Welcome! I'm your **Hedera Copilot** assistant powered by real blockchain tools. 

🚀 **I can execute live transactions on Hedera using your connected account:**

**💰 Token Operations (HTS):**
• Create fungible & non-fungible tokens
• Mint additional tokens & NFTs  
• Airdrop tokens to accounts

**💸 Account Operations:**
• Transfer HBAR between accounts
• Check account balances & information
• Query token balances

**📢 Consensus Service:**
• Create consensus topics
• Submit & retrieve topic messages

All transactions will be executed using your connected Hedera account (**${accountId}**). 

What would you like to build today?`,
        timestamp: new Date(),
        status: "success",
      }
      setMessages([welcomeMessage])

      const workspaceWelcome: Message = {
        id: "workspace-welcome",
        type: "assistant",
        content: `Welcome to your **Hedera Development Workspace**! 

I can help you with:
• 💬 **Ask mode**: Questions about Hedera development, code analysis, and explanations
• 🤖 **Agent mode**: Write and modify code with automatic application

Your account (**${accountId}**) is connected and ready for development.`,
        timestamp: new Date(),
        status: "success",
      }
      setWorkspaceMessages([workspaceWelcome])
    }
  }, [isConnected, accountId, privateKey])

  const validateAccountId = (id: string) => {
    // Pattern allows for multiple digits in each segment (e.g., 0.0.6255888)
    const pattern = /^\d+\.\d+\.\d+$/
    return pattern.test(id)
  }

  const validatePrivateKey = (key: string) => {
    // Accept both raw hex (64 chars) and DER encoded format (96-100 chars starting with 3030)
    const rawHexPattern = /^[a-fA-F0-9]{64}$/
    const derPattern = /^3030[a-fA-F0-9]{92,96}$/  // Allow 96-100 total characters
    return rawHexPattern.test(key) || derPattern.test(key)
  }

  const handleConnect = () => {
    const newErrors: { accountId?: string; privateKey?: string } = {}

    if (!accountId) {
      newErrors.accountId = "Account ID is required"
    } else if (!validateAccountId(accountId)) {
      newErrors.accountId = "Invalid Account ID format (expected: 0.0.6255888)"
    }

    if (!privateKey) {
      newErrors.privateKey = "Private Key is required"
    } else if (!validatePrivateKey(privateKey)) {
      newErrors.privateKey = "Invalid Private Key format (must be DER encoded: 96-100 characters starting with 3030, or 64-character hex)"
    }

    setCredentialErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Invalid credentials",
        description: "Please check your Account ID and Private Key format.",
        variant: "destructive",
      })
      return
    }

    // Store credentials in session storage for consistency with agent page
    sessionStorage.setItem("hedera_account_id", accountId)
    sessionStorage.setItem("hedera_private_key", privateKey)
    
    // Connect the account
    setIsConnected(true)
    setShowWalletModal(false)
    setCredentialErrors({}) // Clear any previous errors
    toast({
      title: "Connected",
      description: "Your Hedera account is now connected.",
    })
  }

  const handleDisconnect = () => {
    // Clear session storage
    sessionStorage.removeItem("hedera_account_id")
    sessionStorage.removeItem("hedera_private_key")
    sessionStorage.removeItem("agent_session_id")
    sessionStorage.removeItem("workspace_session_id")
    
    // Clear backend sessions if they exist
    if (agentSessionId) {
      AgentAPI.clearSession(agentSessionId).catch(err => 
        console.warn('Failed to clear agent session:', err)
      )
    }
    
    if (workspaceSessionId) {
      AgentAPI.clearSession(workspaceSessionId).catch(err => 
        console.warn('Failed to clear workspace session:', err)
      )
    }
    
    setIsConnected(false)
    setAccountId("")
    setPrivateKey("")
    setMessages([])
    setWorkspaceMessages([])
    setAgentSessionId("")
    setWorkspaceSessionId("")
    toast({
      title: "Disconnected",
      description: "Your account has been disconnected. Conversation history cleared.",
    })
  }

  const clearConversation = () => {
    // Clear only conversation history and sessions, keep account connected
    sessionStorage.removeItem("agent_session_id")
    sessionStorage.removeItem("workspace_session_id")
    
    // Clear backend sessions if they exist
    if (agentSessionId) {
      AgentAPI.clearSession(agentSessionId).catch(err => 
        console.warn('Failed to clear agent session:', err)
      )
    }
    
    if (workspaceSessionId) {
      AgentAPI.clearSession(workspaceSessionId).catch(err => 
        console.warn('Failed to clear workspace session:', err)
      )
    }
    
    setMessages([])
    setWorkspaceMessages([])
    setAgentSessionId("")
    setWorkspaceSessionId("")
    
    // Re-add welcome messages
    if (isConnected) {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: "Welcome! I'm your Hedera Copilot assistant powered by real blockchain tools. I can help you create tokens, transfer HBAR, check balances, create topics, and more. What would you like to build today?",
        timestamp: new Date(),
        status: "success",
      }
      setMessages([welcomeMessage])

      const workspaceWelcome: Message = {
        id: "workspace-welcome",
        type: "assistant",
        content: "I'm here to help with your Hedera development. Ask me questions or let me write real blockchain code for you.",
        timestamp: new Date(),
        status: "success",
      }
      setWorkspaceMessages([workspaceWelcome])
    }
    
    toast({
      title: "Conversation Cleared",
      description: "Chat history has been reset. Starting fresh conversation.",
    })
  }

  const executeAgentRequest = async (userInput: string, isWorkspace = false): Promise<Message> => {
    if (!accountId || !privateKey) {
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: "Please ensure you're connected to your Hedera account.",
        timestamp: new Date(),
        status: "error",
      }
    }

    try {
      console.log('Executing agent request:', userInput)
      
      // Get the appropriate session ID
      const currentSessionId = isWorkspace ? workspaceSessionId : agentSessionId
      
      // Generate a new session ID if none exists
      let sessionId = currentSessionId
      if (!sessionId) {
        sessionId = `${isWorkspace ? 'workspace' : 'agent'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // Call the AgentAPI instead of the old endpoint
      const chatRequest: ChatRequest = {
        sessionId,
        accountId,
        privateKey,
        message: userInput,
      }

      const data = await AgentAPI.chat(chatRequest)
      
      if (!data.success) {
        throw new Error(data.error || 'Agent request failed')
      }

      console.log('Agent response:', data.response)
      console.log('Session ID:', data.sessionId)
      
      // Store the session ID for future requests
      if (isWorkspace) {
        setWorkspaceSessionId(data.sessionId)
        sessionStorage.setItem("workspace_session_id", data.sessionId)
      } else {
        setAgentSessionId(data.sessionId)
        sessionStorage.setItem("agent_session_id", data.sessionId)
      }
      
      // Create agent response message
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: formatAgentResponse(data.response || "I processed your request successfully."),
        timestamp: new Date(),
        status: "success",
        transactionData: data.transactionData
      }

    } catch (error) {
      console.error('Agent execution error:', error)
      
      return {
        id: Date.now().toString(),
        type: "assistant",
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your inputs.`,
        timestamp: new Date(),
        status: "error",
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isConnected || inputLocked) return
    
    // Batch state updates to prevent flickering
    const currentInput = inputValue.trim()
    
    // Single state update batch
    startTransition(() => {
    setInputLocked(true)
      setInputValue("") // Clear input immediately for better UX
      setIsLoading(true)

      // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
        content: currentInput,
      timestamp: new Date(),
    }
      setMessages((prev) => [...prev, userMessage])
    })

    try {
      // Execute the real agent
      const agentResponse = await executeAgentRequest(currentInput, false)
      
      // Single state update for response
      startTransition(() => {
        setMessages((prev) => [...prev, agentResponse])
        setIsLoading(false)
      })
      
      // Show appropriate toast
      if (agentResponse.status === "success") {
        toast({
          title: "Operation Completed",
          description: "Your Hedera operation has been processed successfully.",
        })
      } else if (agentResponse.status === "error") {
        toast({
          title: "Operation Failed",
          description: "There was an error processing your request. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Message handling error:', error)
      
      // Single state update for error
      startTransition(() => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "I encountered an unexpected error. Please try again.",
        timestamp: new Date(),
        status: "error",
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsLoading(false)
      })
    } finally {
      // Unlock input with shorter delay to improve responsiveness
      setTimeout(() => {
        startTransition(() => {
          setInputLocked(false)
        })
      }, 200) // Reduced from 500ms to 200ms
    }
  }

  const handleWorkspaceSendMessage = async () => {
    if (!workspaceInput.trim() || !isConnected || workspaceInputLocked) return
    
    // Batch state updates to prevent flickering
    const currentInput = workspaceInput.trim()
    
    // Single state update batch
    startTransition(() => {
    setWorkspaceInputLocked(true)
      setWorkspaceInput("") // Clear input immediately for better UX
      setWorkspaceLoading(true)

      // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
        content: currentInput,
      timestamp: new Date(),
    }
      setWorkspaceMessages((prev) => [...prev, userMessage])
    })

    try {
      // Use simple chat for workspace functionality
      const response = await executeSimpleChatRequest(currentInput)
      
      // Single state update for response
      startTransition(() => {
        setWorkspaceMessages((prev) => [...prev, response])
        setWorkspaceLoading(false)
      })
    } catch (error) {
      console.error('Workspace message error:', error)
      
      // Single state update for error
      startTransition(() => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "I encountered an error. Please try again.",
        timestamp: new Date(),
        status: "error",
      }
      setWorkspaceMessages((prev) => [...prev, errorMessage])
      setWorkspaceLoading(false)
      })
    } finally {
      // Unlock input with shorter delay to improve responsiveness
      setTimeout(() => {
        startTransition(() => {
          setWorkspaceInputLocked(false)
        })
      }, 200) // Reduced from 500ms to 200ms
    }
  }

  // New function for simple chat requests
  const executeSimpleChatRequest = async (userInput: string): Promise<Message> => {
    try {
      console.log('Executing simple chat request:', userInput)
      
      // Generate session ID if needed
      let sessionId = simpleChatSessionId
      if (!sessionId) {
        sessionId = `simple-chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setSimpleChatSessionId(sessionId)
        sessionStorage.setItem("simple_chat_session_id", sessionId)
      }

      // Prepare request with current code context if needed
      const request: SimpleChatRequest = {
        sessionId,
        message: userInput,
        mode: assistantMode,
        currentCode: includeCodebaseContext ? playgroundCode : undefined,
        terminalOutput: includeTerminalContext && playgroundOutput ? playgroundOutput : undefined,
      }

      const data = await SimpleChatAPI.chat(request)
      
      if (!data.success) {
        throw new Error(data.error || 'Simple chat request failed')
      }

      console.log('Simple chat response:', data)
      
      // Create response message
      const responseMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
        status: "success",
        codeChanges: data.codeChanges,
        hasCodeChanges: data.hasCodeChanges,
        originalCode: playgroundCode, // Store original for rollback
      }

      // Auto-apply code changes if in agent mode
      if (assistantMode === 'agent' && data.hasCodeChanges && data.codeChanges) {
        toast({
          title: "🤖 Auto-Applying Code",
          description: `Applying ${data.codeChanges.length} code change(s) to your workspace...`,
          duration: 2000,
        })
        setTimeout(() => {
          applyCodeChangesWithAnimation(responseMessage.id, data.codeChanges!, playgroundCode)
        }, 500) // Small delay for better UX
      }

      return responseMessage

    } catch (error) {
      console.error('Simple chat execution error:', error)
      throw error
    }
  }

  // Apply code changes with enhanced gradient animation and visual feedback
  const applyCodeChangesWithAnimation = async (messageId: string, changes: CodeChange[], originalCode: string) => {
    // Mark message as applying changes
    setWorkspaceMessages((prev) => prev.map((msg) => 
      msg.id === messageId ? { ...msg, isApplyingChanges: true } : msg
    ))

    // Store pending changes for accept/reject
    setPendingCodeChanges({ messageId, changes, originalCode })

    try {
      let newCode = originalCode
      
      // Apply changes in order with better animation timing
      for (let i = 0; i < changes.length; i++) {
        const change = changes[i]
        
        // Show which change is being applied
        toast({
          title: `Applying Change ${i + 1}/${changes.length}`,
          description: change.description,
          duration: 1000,
        })
        
        // Apply the change with animation delay
        await new Promise(resolve => setTimeout(resolve, 800)) // Longer delay for better UX
        newCode = applyCodeChange(newCode, change)
        setPlaygroundCode(newCode)
        
        // Small pause between changes
        if (i < changes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 400))
        }
      }

      // Mark changes as applied
      setWorkspaceMessages((prev) => prev.map((msg) => 
        msg.id === messageId ? { ...msg, isApplyingChanges: false } : msg
      ))

      // Check for syntax errors after a brief delay to let Monaco process the changes
      setTimeout(async () => {
        const syntaxErrors = detectSyntaxErrors()
        
        if (syntaxErrors.length > 0) {
          console.log('Detected syntax errors after code application:', syntaxErrors)
          
          toast({
            title: "⚠️ Syntax Errors Detected",
            description: `Found ${syntaxErrors.length} error(s). Triggering auto-correction...`,
            duration: 3000,
          })
          
          // Trigger automatic correction
          await triggerErrorCorrection(syntaxErrors, newCode)
        } else {
          toast({
            title: "🎉 Code Applied Successfully",
            description: `${changes.length} change(s) applied. You can accept or reject them.`,
            duration: 3000,
          })
        }
      }, 1000) // 1 second delay to let Monaco editor process and validate the code

    } catch (error) {
      console.error('Error applying code changes:', error)
      setWorkspaceMessages((prev) => prev.map((msg) => 
        msg.id === messageId ? { ...msg, isApplyingChanges: false } : msg
      ))
      toast({
        title: "Application Failed",
        description: "Failed to apply code changes.",
        variant: "destructive"
      })
    }
  }

  // Apply individual code change with better line tracking
  const applyCodeChange = (code: string, change: CodeChange): string => {
    const lines = code.split('\n')
    
    switch (change.type) {
      case 'replace':
        if (change.lineRange) {
          const beforeLines = lines.slice(0, change.lineRange.start - 1)
          const afterLines = lines.slice(change.lineRange.end)
          const newLines = change.code.split('\n')
          return [...beforeLines, ...newLines, ...afterLines].join('\n')
        }
        return code
        
      case 'delete':
        if (change.lineRange) {
          const beforeLines = lines.slice(0, change.lineRange.start - 1)
          const afterLines = lines.slice(change.lineRange.end)
          return [...beforeLines, ...afterLines].join('\n')
        }
        return code
        
      case 'insert':
        if (change.position !== undefined) {
          const beforeLines = lines.slice(0, change.position - 1)
          const afterLines = lines.slice(change.position - 1)
          const newLines = change.code.split('\n')
          return [...beforeLines, ...newLines, ...afterLines].join('\n')
        }
        return code
        
      case 'append':
        return code + '\n' + change.code
        
      case 'prepend':
        return change.code + '\n' + code
        
      default:
        return code
    }
  }

  // Accept code changes with enhanced feedback
  const acceptCodeChanges = (messageId: string) => {
    if (pendingCodeChanges && pendingCodeChanges.messageId === messageId) {
      setPendingCodeChanges(null)
      setWorkspaceMessages((prev) => prev.map((msg) => 
        msg.id === messageId ? { ...msg, isAccepted: true } : msg
      ))
      toast({
        title: "✅ Changes Accepted",
        description: `${pendingCodeChanges.changes.length} code change(s) have been permanently applied.`,
        duration: 2000,
      })
    }
  }

  // Reject code changes with enhanced feedback
  const rejectCodeChanges = (messageId: string) => {
    if (pendingCodeChanges && pendingCodeChanges.messageId === messageId) {
      // Restore original code with animation
      setPlaygroundCode(pendingCodeChanges.originalCode)
      setPendingCodeChanges(null)
      setWorkspaceMessages((prev) => prev.map((msg) => 
        msg.id === messageId ? { ...msg, isAccepted: false } : msg
      ))
      toast({
        title: "🔄 Changes Rejected",
        description: "Original code has been restored. All changes reverted.",
        duration: 2000,
      })
    }
  }

  const addToEditor = (code: string) => {
    setPlaygroundCode(code)
    toast({
      title: "Added to Editor",
      description: "Code loaded in the editor.",
    })
  }

  const acceptCodeProposal = (messageId: string, code: string) => {
    setWorkspaceMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isAccepted: true } : msg)))
    setPlaygroundCode(code)
    toast({
      title: "Code Accepted",
      description: "Code has been added to the editor.",
    })
  }

  const executeCode = async () => {
    // Get the most current code - check Monaco editor first, then fallback to ref
    let codeToExecute = currentCodeRef.current.trim()
    
    // If Monaco editor is available, get the current value directly from it
    if (monacoEditorRef.current) {
      const editorValue = monacoEditorRef.current.getValue()
      if (editorValue && editorValue.trim()) {
        codeToExecute = editorValue.trim()
        // Update the ref to match the editor
        currentCodeRef.current = editorValue
      }
    }
    
    if (!codeToExecute) return;
    
    setIsExecuting(true);
    setPlaygroundOutput("🚀 Starting execution...\n");

    try {
      const request: CodeExecutionRequest = {
        code: codeToExecute
      };

      const data = await AgentAPI.executeCode(request);
      
      if (data.output) {
        setPlaygroundOutput(prev => prev + "\n" + data.output);
      } else if (data.error) {
        setPlaygroundOutput(prev => prev + "\n❌ " + data.error);
      }

      if (data.success) {
        setPlaygroundOutput(prev => prev + "\n\n✅ Execution completed successfully");
      } else {
        setPlaygroundOutput(prev => prev + "\n\n💥 Execution failed");
      }

    } catch (error) {
      setPlaygroundOutput(prev => prev + "\n❌ Network error: " + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExecuting(false);
      setPlaygroundOutput(prev => prev + "\n\n" + "─".repeat(50) + "\nReady for next execution...\n");
    }
  }

  const clearCode = () => {
    if (accountId && privateKey) {
      setPlaygroundCode(generateJavaScriptTemplate(accountId, privateKey));
    } else {
      setPlaygroundCode("");
    }
    setPlaygroundOutput("");
  }

  // Copy code to clipboard
  const copyCodeToClipboard = async () => {
    try {
      const codeTosCopy = currentCodeRef.current
      await navigator.clipboard.writeText(codeTosCopy);
      toast({
        title: "📋 Code Copied",
        description: "Code has been copied to clipboard.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy code to clipboard.",
        variant: "destructive"
      });
    }
  }

  // Save code as .js file
  const saveCodeToFile = () => {
    try {
      const codeToSave = currentCodeRef.current
      const blob = new Blob([codeToSave], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `hedera-code-${timestamp}.js`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "💾 Code Saved",
        description: `Code saved as ${link.download}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to save code:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save code to file.",
        variant: "destructive"
      });
    }
  }

  const clearWorkspaceConversation = async () => {
    try {
      if (simpleChatSessionId) {
        await SimpleChatAPI.clearSession(simpleChatSessionId)
        setSimpleChatSessionId("")
        sessionStorage.removeItem("simple_chat_session_id")
      }
      setWorkspaceMessages([])
      setPendingCodeChanges(null)
      toast({
        title: "Conversation Cleared",
        description: "Workspace conversation has been cleared.",
      })
    } catch (error) {
      console.error('Error clearing workspace conversation:', error)
      toast({
        title: "Clear Failed",
        description: "Failed to clear conversation.",
        variant: "destructive"
      })
    }
  }

  // Smart code merging logic - removes duplicates and intelligently merges
  const mergeCodeIntelligently = useCallback((existingCode: string, newCode: string): string => {
    const existingLines = existingCode.split('\n');
    const newLines = newCode.split('\n');
    
    // Find existing imports/requires/destructuring
    const existingImports = existingLines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('import ') || 
             (trimmed.startsWith('const ') && line.includes('require(')) ||
             trimmed.startsWith('require(') ||
             (trimmed.startsWith('const {') && trimmed.includes('} = require('));
    });
    
    // Find new imports/requires/destructuring
    const newImports = newLines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('import ') || 
             (trimmed.startsWith('const ') && line.includes('require(')) ||
             trimmed.startsWith('require(') ||
             (trimmed.startsWith('const {') && trimmed.includes('} = require('));
    });
    
    // Merge imports intelligently (avoid duplicates, merge destructuring)
    const mergedImports = [...existingImports];
    
    newImports.forEach(newImport => {
      const newTrimmed = newImport.trim();
      
      // Check if it's a destructuring require
      if (newTrimmed.startsWith('const {') && newTrimmed.includes('} = require(')) {
        const packageMatch = newTrimmed.match(/require\(['"]([^'"]+)['"]\)/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          
          // Find existing import for same package
          const existingIndex = mergedImports.findIndex(existing => 
            existing.includes(`require('${packageName}')`) || 
            existing.includes(`require("${packageName}")`)
          );
          
          if (existingIndex >= 0) {
            // Merge destructuring
            const existingImport = mergedImports[existingIndex];
            const existingVars = existingImport.match(/const\s*{\s*([^}]+)\s*}\s*=/);
            const newVars = newTrimmed.match(/const\s*{\s*([^}]+)\s*}\s*=/);
            
            if (existingVars && newVars) {
              const existingVarList = existingVars[1].split(',').map(v => v.trim());
              const newVarList = newVars[1].split(',').map(v => v.trim());
              
              // Combine and deduplicate
              const combinedVars = [...new Set([...existingVarList, ...newVarList])];
              mergedImports[existingIndex] = `const { ${combinedVars.join(', ')} } = require('${packageName}');`;
            }
          } else {
            mergedImports.push(newImport);
          }
        }
      } else if (!mergedImports.some(existing => existing.trim() === newTrimmed)) {
        mergedImports.push(newImport);
      }
    });
    
    // Extract useful code from the new code, handling function definitions
    const extractedCode: string[] = [];
    let inFunction = false;
    let functionContent: string[] = [];
    let braceCount = 0;
    
    for (const line of newLines) {
      const trimmed = line.trim();
      
      // Skip imports and empty lines
      if (trimmed.startsWith('import ') || 
          (trimmed.startsWith('const ') && line.includes('require(')) ||
          trimmed.startsWith('require(') ||
          (trimmed.startsWith('const {') && trimmed.includes('} = require(')) ||
          trimmed === '' ||
          trimmed === 'main();') {
        continue;
      }
      
      // Check if this is a function declaration
      if (trimmed.match(/^(async\s+)?function\s+\w+\s*\(/)) {
        inFunction = true;
        functionContent = [];
        braceCount = 0;
        continue;
      }
      
      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount > 0 || !trimmed.startsWith('}')) {
          functionContent.push(line);
        }
        
        if (braceCount <= 0 && trimmed.startsWith('}')) {
          // End of function - extract the useful parts
          const functionBody = functionContent.join('\n');
          
          // Extract the core logic from try-catch blocks
          const tryMatch = functionBody.match(/try\s*{\s*\n([\s\S]*?)\n\s*}\s*catch/);
          if (tryMatch) {
            const tryContent = tryMatch[1];
            const usefulLines = tryContent.split('\n').filter(line => {
              const trimmed = line.trim();
              return trimmed && 
                     !trimmed.startsWith('//') &&
                     !trimmed.startsWith('return ') &&
                     !trimmed.startsWith('throw ');
            });
            extractedCode.push(...usefulLines);
          } else {
            // Extract all non-return, non-throw lines from function
            const usefulLines = functionContent.filter(line => {
              const trimmed = line.trim();
              return trimmed && 
                     !trimmed.startsWith('//') &&
                     !trimmed.startsWith('return ') &&
                     !trimmed.startsWith('throw ') &&
                     !trimmed.startsWith('{') &&
                     !trimmed.startsWith('}');
            });
            extractedCode.push(...usefulLines);
          }
          
          inFunction = false;
          functionContent = [];
        }
      } else {
        // Regular code that's not in a function
        if (trimmed && !trimmed.startsWith('//')) {
          extractedCode.push(line);
        }
      }
    }
    
    // Find the main function in existing code and insert the extracted code
    const mainFunctionStart = existingCode.indexOf('async function main()');
    const mainFunctionEnd = existingCode.lastIndexOf('main();');
    
    if (mainFunctionStart !== -1 && mainFunctionEnd !== -1 && extractedCode.length > 0) {
      const beforeMain = existingCode.substring(0, mainFunctionStart);
      const mainFunction = existingCode.substring(mainFunctionStart, mainFunctionEnd);
      const afterMain = existingCode.substring(mainFunctionEnd);
      
      // Look for insertion points in the main function
      const insertionPatterns = [
        // After the "Start your code here" comment
        /(\s*\/\/\s*Start your code here[\s\S]*?)(\s*\/\/\s*Example:)/,
        // After the console.log statements
        /(\s*console\.log\("🏦 Account ID:"[\s\S]*?\n)([\s\S]*)/,
        // Before the example comment block
        /(\s*)(\/\/\s*Example:[\s\S]*)/,
        // Before the catch block
        /(\s*)(\s*} catch \(error\))/
      ];
      
      let modifiedMainFunction = mainFunction;
      let insertionMade = false;
      
      for (const pattern of insertionPatterns) {
        const match = mainFunction.match(pattern);
        if (match) {
          const beforeInsertion = match[1];
          const afterInsertion = match[2] || '';
          
          // Add proper indentation to extracted code
          const indentedNewCode = extractedCode
            .map(line => line.trim() ? `    ${line}` : '')
            .filter(line => line.trim())
            .join('\n');
          
          modifiedMainFunction = beforeInsertion + '\n    \n    // Added functionality:\n' + indentedNewCode + '\n    ' + afterInsertion;
          insertionMade = true;
          break;
        }
      }
      
      // If no specific insertion point found, add before the catch block
      if (!insertionMade) {
        const catchMatch = mainFunction.match(/(\s*)(} catch \(error\))/);
        if (catchMatch && catchMatch.index !== undefined) {
          const beforeCatch = mainFunction.substring(0, catchMatch.index);
          const afterCatch = mainFunction.substring(catchMatch.index);
          
          const indentedNewCode = extractedCode
            .map(line => line.trim() ? `    ${line}` : '')
            .filter(line => line.trim())
            .join('\n');
          
          modifiedMainFunction = beforeCatch + '\n    // Added functionality:\n' + indentedNewCode + '\n  ' + afterCatch;
        }
      }
      
      // Construct the final code
      const result = [
        ...mergedImports,
        '',
        beforeMain + modifiedMainFunction + afterMain
      ].filter(line => line !== null).join('\n');
      
      return result;
    } else {
      // No main function found or no extracted code, return existing code
      return existingCode;
    }
  }, [])

  // Copy code block to clipboard
  const copyCodeBlock = useCallback(async (codeId: string) => {
    try {
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const codeText = codeElement.textContent || '';
        await navigator.clipboard.writeText(codeText);
        toast({
          title: "📋 Copied!",
          description: "Code copied to clipboard.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy code to clipboard.",
        variant: "destructive"
      });
    }
  }, [toast])

  // Add code to workspace with intelligent merging and redirect
  const addCodeToWorkspace = useCallback((codeId: string) => {
    try {
      const codeElement = document.getElementById(codeId);
      if (codeElement) {
        const newCode = codeElement.textContent || '';
        const mergedCode = mergeCodeIntelligently(playgroundCode, newCode);
        setPlaygroundCode(mergedCode);
        
        // Redirect to workspace tab
        setMode("workspace");
        
        toast({
          title: "✅ Added to Workspace",
          description: "Code merged and workspace opened.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to add code to workspace:', error);
      toast({
        title: "Add Failed",
        description: "Failed to add code to workspace.",
        variant: "destructive"
      });
    }
  }, [playgroundCode, toast, setMode, setPlaygroundCode, mergeCodeIntelligently])



  // Make functions globally available for onclick handlers
  useEffect(() => {
    (window as any).copyCodeBlock = copyCodeBlock;
    (window as any).addCodeToWorkspace = addCodeToWorkspace;
    
    return () => {
      delete (window as any).copyCodeBlock;
      delete (window as any).addCodeToWorkspace;
    };
  }, [copyCodeBlock, addCodeToWorkspace]);

  // Update the ref whenever playgroundCode changes
  useEffect(() => {
    currentCodeRef.current = playgroundCode
  }, [playgroundCode])

  // Debounced input handlers to prevent excessive state updates
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    
    // Clear existing debounce
    if (inputDebounceRef.current) {
      clearTimeout(inputDebounceRef.current)
    }
    
    // Set new debounce
    inputDebounceRef.current = setTimeout(() => {
      setDebouncedInputValue(value)
    }, 150) // 150ms debounce
  }, [])

  const handleWorkspaceInputChange = useCallback((value: string) => {
    setWorkspaceInput(value)
    
    // Clear existing debounce
    if (workspaceDebounceRef.current) {
      clearTimeout(workspaceDebounceRef.current)
    }
    
    // Set new debounce
    workspaceDebounceRef.current = setTimeout(() => {
      setDebouncedWorkspaceInput(value)
    }, 150) // 150ms debounce
  }, [])

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (inputDebounceRef.current) {
        clearTimeout(inputDebounceRef.current)
      }
      if (workspaceDebounceRef.current) {
        clearTimeout(workspaceDebounceRef.current)
      }
    }
  }, [])

  // Mouse event handlers for editor resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartHeight(editorHeight)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  // Touch event handlers for mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStartY(e.touches[0].clientY)
    setDragStartHeight(editorHeight)
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    const newHeight = Math.max(200, Math.min(800, dragStartHeight + deltaY)) // Min 200px, max 800px
    setEditorHeight(newHeight)
  }, [isDragging, dragStartY, dragStartHeight])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    
    e.preventDefault()
    const deltaY = e.touches[0].clientY - dragStartY
    const newHeight = Math.max(200, Math.min(800, dragStartHeight + deltaY)) // Min 200px, max 800px
    setEditorHeight(newHeight)
  }, [isDragging, dragStartY, dragStartHeight])

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    document.body.style.userSelect = ''
  }, [isDragging])

  // Add global mouse and touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">B</span>
              </div>
              <span className="text-lg font-medium text-gray-900">BuildO</span>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setMode("agent")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === "agent" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Agent
              </button>
              <button
                onClick={() => setMode("workspace")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === "workspace"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                Workspace
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-mono text-green-700">
                    {accountId.split(".").slice(0, 2).join(".")}.***
                  </span>
                  <Separator orientation="vertical" className="h-3" />
                  <span className="text-sm font-medium text-green-700">{balance} ℏ</span>
                </div>
                {/* Session Status Indicators */}
                {(agentSessionId || workspaceSessionId) && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-blue-700">
                      {mode === "agent" && agentSessionId ? "Chat Active" : 
                       mode === "workspace" && workspaceSessionId ? "Workspace Active" : ""}
                    </span>
                  </div>
                )}
                {/* Clear Conversation Button */}
                {(agentSessionId || workspaceSessionId) && (
                  <Button variant="outline" size="sm" onClick={clearConversation}>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear Chat
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowWalletModal(true)} className="bg-gray-900 hover:bg-gray-800 text-white">
                <Wallet className="w-4 h-4 mr-2" />
                  Connect Hedera Account
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {mode === "agent" ? (
          /* Agent Mode */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-4">
                    {/* Message */}
                    <div className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-start space-x-3 max-w-[80%]`}>
                        {message.type === "assistant" && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-xs">B</span>
                            </div>
                          </div>
                        )}

                        <div className={`flex-1 ${message.type === "user" ? "flex justify-end" : ""}`}>
                          <div
                            className={`rounded-lg px-4 py-3 ${
                              message.type === "user"
                                ? "bg-blue-600 text-white max-w-fit"
                                : "bg-gray-50 text-gray-900 w-full"
                            }`}
                          >
                            <MessageContent content={message.content} messageId={message.id} />
                            
                            {/* Transaction Data */}
                            {message.transactionData && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center text-green-800 text-sm font-medium mb-2">
                                  <Check className="w-4 h-4 mr-2" />
                                  {message.transactionData.action}
                                </div>
                                <div className="space-y-1">
                                  {message.transactionData.details.map((detail, index) => (
                                    <p key={index} className="text-xs text-green-700">{detail}</p>
                                  ))}
                                  {message.transactionData.transactionHash && (
                                    <p className="text-xs text-green-700">
                                      Transaction Hash: {message.transactionData.transactionHash}
                                    </p>
                                  )}
                                  {message.transactionData.estimatedCost && (
                                  <p className="text-xs text-green-700">
                                    Network Fee: {message.transactionData.estimatedCost}
                                  </p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-2">
                            <p
                                className={`text-xs opacity-70 ${
                                message.type === "user" ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                              {message.type === "assistant" && message.status && (
                                <div className={`text-xs flex items-center ${
                                  message.status === "success" ? "text-green-600" : 
                                  message.status === "error" ? "text-red-600" : "text-yellow-600"
                                }`}>
                                  {message.status === "success" && <Check className="w-3 h-3 mr-1" />}
                                  {message.status === "error" && <X className="w-3 h-3 mr-1" />}
                                  {message.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                                  {message.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {message.type === "user" && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Code Blocks */}
                    {message.codeBlocks && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-3 max-w-[90%] w-full">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Code className="w-4 h-4 text-gray-600" />
                            </div>
                          </div>
                          <div className="w-full">
                            <Tabs defaultValue={message.codeBlocks[0]?.language} className="w-full">
                              <TabsList className="grid w-fit grid-cols-3 mb-4">
                                {message.codeBlocks.map((block) => (
                                  <TabsTrigger key={block.language} value={block.language} className="text-xs">
                                    {block.language === "javascript"
                                      ? "JavaScript"
                                      : block.language === "java"
                                        ? "Java"
                                        : "Rust"}
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                              {message.codeBlocks.map((block) => (
                                <TabsContent key={block.language} value={block.language}>
                                  <Card className="border-gray-200">
                                    <CardContent className="p-0">
                                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                                        <span className="text-sm font-medium text-gray-700">{block.title}</span>
                                      </div>
                                      <div className="relative">
                                        <pre className="p-4 text-sm overflow-x-auto bg-gray-900 text-gray-100 max-h-80 overflow-y-auto">
                                          <code className="font-mono">{block.code}</code>
                                        </pre>
                                      </div>
                                      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                                        <Button
                                          size="sm"
                                          onClick={() => addToEditor(block.code)}
                                          className="bg-gray-900 hover:bg-gray-800 text-white"
                                        >
                                          Add to Workspace
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </TabsContent>
                              ))}
                            </Tabs>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-[80%]">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">B</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-3">
                  <Textarea
                    placeholder={
                      isConnected ? "Ask me to help you build on Hedera..." : "Connect your wallet to start building..."
                    }
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.repeat) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1 min-h-[48px] max-h-32 resize-none border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                    disabled={!isConnected || isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || !isConnected || isLoading}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 h-[48px]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Workspace Mode */
          <div className="flex-1 flex flex-col min-h-0 px-4 py-4">
            <div className="max-w-full mx-auto w-full flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* Code Editor */}
                <div className="col-span-8 flex flex-col min-h-0">
                  {/* Editor */}
                  <Card 
                    className="border-gray-200 flex flex-col min-h-0"
                    style={{ height: `${editorHeight}px` }}
                    ref={editorContainerRef}
                  >
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-medium text-gray-700">JavaScript Editor</span>
                          <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md font-medium">
                            Hedera SDK Ready
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={copyCodeToClipboard}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 bg-transparent"
                            disabled={!playgroundCode.trim()}
                            title="Copy code to clipboard"
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Copy
                          </Button>
                          <Button
                            onClick={saveCodeToFile}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 bg-transparent"
                            disabled={!playgroundCode.trim()}
                            title="Save code as .js file"
                          >
                            <Save className="w-3 h-3 mr-2" />
                            Save
                          </Button>
                          <Button
                            onClick={clearCode}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 bg-transparent"
                            disabled={!playgroundCode.trim()}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Clear
                          </Button>
                          <Button
                            onClick={executeCode}
                            disabled={!playgroundCode.trim() || isExecuting}
                            className="bg-gray-900 hover:bg-gray-800 text-white h-8 px-3"
                          >
                            {isExecuting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Executing
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-2" />
                                Execute
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <Editor
                          height="100%"
                          defaultLanguage="javascript"
                          value={playgroundCode}
                          onChange={(value) => setPlaygroundCode(value || "")}
                          onMount={(editor, monaco) => {
                            // Store editor and monaco instances for error detection
                            monacoEditorRef.current = editor;
                            monacoRef.current = monaco;
                            
                            // Set cursor to line 2, column 1 where the actual code starts
                            editor.setPosition({ lineNumber: 2, column: 1 });
                            editor.focus();
                          }}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                            lineNumbers: "on",
                            roundedSelection: false,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            insertSpaces: true,
                            wordWrap: "on",
                            contextmenu: false,
                            folding: true,
                            renderLineHighlight: "line",
                            smoothScrolling: true,
                            mouseWheelZoom: false,
                            fastScrollSensitivity: 5,
                            scrollbar: {
                              vertical: 'visible',
                              horizontal: 'visible',
                              useShadows: false,
                              verticalHasArrows: false,
                              horizontalHasArrows: false,
                              verticalScrollbarSize: 10,
                              horizontalScrollbarSize: 10
                            },
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,
                            selectOnLineNumbers: true,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Drag Handle */}
                  <div
                    className={`h-2 bg-gray-100 border-t border-b border-gray-200 cursor-row-resize flex items-center justify-center group hover:bg-gray-200 transition-all duration-200 ${
                      isDragging ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    title="Drag to resize editor"
                  >
                    <div className={`w-8 h-0.5 rounded transition-all duration-200 ${
                      isDragging ? 'bg-blue-500 w-12' : 'bg-gray-400 group-hover:bg-gray-500'
                    }`}></div>
                  </div>

                  {/* Terminal */}
                  <Card className="border-gray-200 flex-1 flex flex-col min-h-0" style={{ minHeight: '150px' }}>
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center">
                          <Terminal className="w-4 h-4 mr-2 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Output</span>
                        </div>
                        <Button
                          onClick={() => setPlaygroundOutput("")}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex-1 p-4 bg-gray-900 text-green-400 font-mono text-sm overflow-y-auto min-h-0">
                        <pre className="whitespace-pre-wrap">
                          {playgroundOutput ||
                            "Ready to execute JavaScript code...\n\nClick 'Execute' to run your Hedera code and see output here."}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Chat Assistant */}
                <div className="col-span-4 flex flex-col min-h-0">
                  <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                      {/* Assistant Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <span className="text-sm font-medium text-gray-700">Assistant</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearWorkspaceConversation}
                          className="h-6 px-2 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Clear
                        </Button>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {workspaceMessages.map((message) => (
                          <div key={message.id} className="space-y-3">
                            {/* Message */}
                            <div className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`flex items-start space-x-2 max-w-[90%]`}>
                                {message.type === "assistant" && (
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs">B</span>
                                    </div>
                                  </div>
                                )}

                                <div className={`flex-1 ${message.type === "user" ? "flex justify-end" : ""}`}>
                                  <div
                                    className={`rounded-lg px-3 py-2 ${
                                      message.type === "user"
                                        ? "bg-blue-600 text-white max-w-fit"
                                        : "bg-gray-50 text-gray-900 w-full"
                                    }`}
                                  >
                                    <MessageContent content={message.content} messageId={message.id} />
                                    {message.type === "assistant" && message.status && (
                                      <div className={`text-xs flex items-center mt-1 ${
                                        message.status === "success" ? "text-green-600" : 
                                        message.status === "error" ? "text-red-600" : "text-yellow-600"
                                      }`}>
                                        {message.status === "success" && <Check className="w-2 h-2 mr-1" />}
                                        {message.status === "error" && <X className="w-2 h-2 mr-1" />}
                                        {message.status === "pending" && <Clock className="w-2 h-2 mr-1" />}
                                        {message.status}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {message.type === "user" && (
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                      <User className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Code Proposal */}
                            {message.codeBlocks && message.isCodeProposal && (
                              <div className="flex justify-start">
                                <div className="flex items-start space-x-2 max-w-[95%] w-full">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                      <Code className="w-3 h-3 text-gray-600" />
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <Card className="border-gray-200">
                                      <CardContent className="p-0">
                                        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                                          <span className="text-xs font-medium text-gray-700">
                                            {message.codeBlocks[0].title}
                                          </span>
                                        </div>
                                        <div className="relative">
                                          <pre className="p-3 text-xs overflow-x-auto bg-gray-900 text-gray-100 max-h-40 overflow-y-auto">
                                            <code className="font-mono">{message.codeBlocks[0].code}</code>
                                          </pre>
                                        </div>
                                        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                                          {message.isAccepted ? (
                                            <div className="flex items-center text-xs text-green-600">
                                              <Check className="w-3 h-3 mr-1" />
                                              Code accepted
                                            </div>
                                          ) : (
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                acceptCodeProposal(
                                                  message.id,
                                                  message.codeBlocks![0].code,
                                                )
                                              }
                                              className="bg-gray-900 hover:bg-gray-800 text-white h-6 px-2 text-xs"
                                            >
                                              <Check className="w-3 h-3 mr-1" />
                                              Accept
                                            </Button>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Enhanced Code Changes Display with Diff Visualization */}
                            {message.hasCodeChanges && message.codeChanges && (
                              <div className="flex justify-start">
                                <div className="flex items-start space-x-2 max-w-[95%] w-full">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <Bot className="w-3 h-3 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="w-full">
                                    <Card className={`border-blue-200 transition-all duration-500 ${
                                      message.isApplyingChanges ? 'bg-gradient-to-b from-blue-50 to-white' : ''
                                    }`}>
                                      <CardContent className="p-0">
                                        <div className="px-3 py-2 border-b border-blue-200 bg-blue-50">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-blue-900">
                                              Code Changes {message.isApplyingChanges && '(Applying...)'}
                                            </span>
                                            {message.isApplyingChanges && (
                                              <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Gradient Animation Overlay */}
                                        {message.isApplyingChanges && (
                                          <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 via-transparent to-transparent animate-pulse z-10 pointer-events-none"></div>
                                        )}

                                        <div className="space-y-3 p-3">
                                          {message.codeChanges.map((change, index) => (
                                            <div 
                                              key={index} 
                                              className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 ${
                                                message.isApplyingChanges ? 'bg-blue-50 animate-pulse' : 'bg-white'
                                              }`}
                                            >
                                              {/* Change Header */}
                                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                      change.type === 'delete' ? 'bg-red-100 text-red-800' :
                                                      change.type === 'replace' ? 'bg-yellow-100 text-yellow-800' :
                                                      'bg-green-100 text-green-800'
                                                    }`}>
                                                      {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                                                    </span>
                                                    <span className="text-xs text-gray-600">{change.description}</span>
                                                  </div>
                                                  <span className="text-xs text-gray-500">
                                                    {change.lineRange ? `Lines ${change.lineRange.start}-${change.lineRange.end}` : 
                                                     change.position ? `Line ${change.position}` : ''}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Diff Display */}
                                              <div className="text-xs font-mono">
                                                {/* Context Before */}
                                                {change.preview?.before && (
                                                  <div className="px-3 py-1 bg-gray-50 text-gray-600 border-b border-gray-100">
                                                    <div className="flex">
                                                      <span className="w-8 text-gray-400 select-none">...</span>
                                                      <span>{change.preview.before}</span>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Deletion (Red) */}
                                                {(change.type === 'replace' || change.type === 'delete') && change.oldCode && (
                                                  <div className="bg-red-50 border-l-4 border-red-400">
                                                    {change.oldCode.split('\n').map((line, i) => (
                                                      <div key={`del-${i}`} className="flex hover:bg-red-100">
                                                        <span className="w-8 bg-red-200 text-red-600 text-center select-none">-</span>
                                                        <span className="px-3 py-1 text-red-800 flex-1">{line}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Addition (Green) */}
                                                {(change.type !== 'delete') && change.code && (
                                                  <div className="bg-green-50 border-l-4 border-green-400">
                                                    {change.code.split('\n').map((line, i) => (
                                                      <div key={`add-${i}`} className="flex hover:bg-green-100">
                                                        <span className="w-8 bg-green-200 text-green-600 text-center select-none">+</span>
                                                        <span className="px-3 py-1 text-green-800 flex-1">{line}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Context After */}
                                                {change.preview?.after && (
                                                  <div className="px-3 py-1 bg-gray-50 text-gray-600 border-t border-gray-100">
                                                    <div className="flex">
                                                      <span className="w-8 text-gray-400 select-none">...</span>
                                                      <span>{change.preview.after}</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Accept/Reject Buttons */}
                                        {!message.isApplyingChanges && (
                                          <div className="px-3 py-2 border-t border-blue-200 bg-blue-50">
                                            {message.isAccepted === true ? (
                                              <div className="flex items-center text-xs text-green-600">
                                                <Check className="w-3 h-3 mr-1" />
                                                Changes accepted and applied
                                              </div>
                                            ) : message.isAccepted === false ? (
                                              <div className="flex items-center text-xs text-red-600">
                                                <X className="w-3 h-3 mr-1" />
                                                Changes rejected and reverted
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-600">
                                                  {message.codeChanges?.length} change(s) ready to apply
                                                </div>
                                                <div className="flex space-x-2">
                                                  <Button
                                                    size="sm"
                                                    onClick={() => acceptCodeChanges(message.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                                                  >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Accept All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => rejectCodeChanges(message.id)}
                                                    className="border-red-300 text-red-600 hover:bg-red-50 h-6 px-2 text-xs"
                                                  >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Reject All
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {workspaceLoading && (
                          <div className="flex justify-start">
                            <div className="flex items-start space-x-2 max-w-[90%]">
                              <div className="flex-shrink-0 mt-1">
                                <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">B</span>
                                </div>
                              </div>
                              <div className="bg-gray-50 rounded-lg px-3 py-2">
                                <div className="flex items-center space-x-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div ref={workspaceMessagesEndRef} />
                      </div>

                      {/* Input */}
                      <div className="border-t border-gray-200 p-3">
                        {/* Context Options */}
                        <div className="mb-3">
                          <div className="relative" ref={contextOptionsRef}>
                            <button
                              onClick={() => setShowContextOptions(!showContextOptions)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors w-full justify-between"
                            >
                          <div className="flex items-center space-x-2">
                                <Settings className="w-4 h-4" />
                                <span className="font-medium">Context Options</span>
                                {(includeCodebaseContext || includeTerminalContext) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {[includeCodebaseContext && 'Code', includeTerminalContext && 'Terminal'].filter(Boolean).join(', ')}
                              </span>
                            )}
                              </div>
                              <svg 
                                className={`w-4 h-4 transition-transform ${showContextOptions ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {showContextOptions && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 space-y-3">
                                {/* Codebase Context Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Code className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">Include Codebase Context</span>
                          </div>
                          <button
                            onClick={() => setIncludeCodebaseContext(!includeCodebaseContext)}
                                    className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                      includeCodebaseContext ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                                      className={`inline-block w-3 h-3 transform transition-transform bg-white rounded-full ${
                                        includeCodebaseContext ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                                </div>
                                
                                {/* Terminal Context Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Terminal className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">Include Terminal Context</span>
                                  </div>
                                  <button
                                    onClick={() => setIncludeTerminalContext(!includeTerminalContext)}
                                    className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                      includeTerminalContext ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block w-3 h-3 transform transition-transform bg-white rounded-full ${
                                        includeTerminalContext ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                                
                                {/* Context Info */}
                                {(includeCodebaseContext || includeTerminalContext) && (
                                  <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                      {includeCodebaseContext && includeTerminalContext && "Both code and terminal output will be included as context."}
                                      {includeCodebaseContext && !includeTerminalContext && "Current code will be included as context."}
                                      {!includeCodebaseContext && includeTerminalContext && "Terminal output will be included as context."}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Toggle Buttons */}
                        <div className="flex items-center space-x-1 mb-3">
                          <button
                            onClick={() => setAssistantMode("ask")}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                              assistantMode === "ask"
                                ? "bg-gray-900 text-white"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Ask
                          </button>
                          <button
                            onClick={() => setAssistantMode("agent")}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                              assistantMode === "agent"
                                ? "bg-gray-900 text-white"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            <Bot className="w-3 h-3 mr-1" />
                            Agent
                          </button>
                        </div>
                        
                        {/* Input Area */}
                        <div className="flex space-x-2">
                          <Textarea
                            placeholder={
                              assistantMode === "ask" ? "Ask me a question..." : "Tell me what code to write..."
                            }
                            value={workspaceInput}
                            onChange={(e) => handleWorkspaceInputChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey && !e.repeat) {
                                e.preventDefault()
                                handleWorkspaceSendMessage()
                              }
                            }}
                            className="flex-1 min-h-[32px] max-h-20 resize-none border-gray-300 focus:border-gray-400 focus:ring-gray-400 text-xs"
                            disabled={!isConnected || workspaceLoading}
                          />
                          <Button
                            onClick={handleWorkspaceSendMessage}
                            disabled={!workspaceInput.trim() || !isConnected || workspaceLoading}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-3 h-[32px]"
                            size="sm"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connect Hedera Account Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg border-gray-200 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Connect Hedera Account</h2>
                  <p className="text-sm text-gray-600 mt-1">Securely provide your account credentials to start building</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowWalletModal(false)
                    setCredentialErrors({})
                  }}
                  className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Security Notice */}
              <Alert className="mb-6 border-purple-200 bg-purple-50">
                <Shield className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800 text-sm">
                  <strong>Security Notice:</strong> Your credentials are stored in your browser's session storage (temporary) and are never transmitted to external servers.
                  <br />
                </AlertDescription>
              </Alert>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="accountId" className="text-sm font-medium text-gray-900 mb-2 block">
                    Account ID
                  </Label>
                  <Input
                    id="accountId"
                    placeholder="0.0.6255888"
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(e.target.value)
                      if (credentialErrors.accountId) {
                        setCredentialErrors(prev => ({ ...prev, accountId: undefined }))
                      }
                    }}
                    className={`${credentialErrors.accountId ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-gray-400 focus:ring-gray-400"}`}
                  />
                  {credentialErrors.accountId && (
                    <p className="text-sm text-red-600 mt-1">{credentialErrors.accountId}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="privateKey" className="text-sm font-medium text-gray-900 mb-2 block">
                    Private Key (DER Encoded)
                  </Label>
                  <div className="relative">
                    <Input
                      id="privateKey"
                      type={showPrivateKey ? "text" : "password"}
                      placeholder="Enter your private key (DER encoded)"
                      value={privateKey}
                      onChange={(e) => {
                        setPrivateKey(e.target.value)
                        if (credentialErrors.privateKey) {
                          setCredentialErrors(prev => ({ ...prev, privateKey: undefined }))
                        }
                      }}
                      className={`pr-10 ${credentialErrors.privateKey ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-gray-400 focus:ring-gray-400"}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-3 w-3 text-gray-500" />
                      ) : (
                        <Eye className="h-3 w-3 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  {credentialErrors.privateKey && (
                    <p className="text-sm text-red-600 mt-1">{credentialErrors.privateKey}</p>
                  )}
                </div>

                <Button onClick={handleConnect} className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 mt-6">
                  Connect Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
