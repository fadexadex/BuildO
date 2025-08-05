"use client"

import { useState, useEffect, useRef } from "react"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AgentAPI, ChatRequest, CodeExecutionRequest } from "@/lib/api"

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
    estimatedCost: string
    details: string[]
    transactionHash?: string
  }
}

export default function BuildOPlayground() {
  const { toast } = useToast()
  const [mode, setMode] = useState<"agent" | "workspace">("agent")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [playgroundCode, setPlaygroundCode] = useState("")
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

  // Session management states
  const [agentSessionId, setAgentSessionId] = useState<string>("")
  const [workspaceSessionId, setWorkspaceSessionId] = useState<string>("")

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const workspaceMessagesEndRef = useRef<HTMLDivElement>(null)

  // Generate JavaScript template with user's credentials
  const generateJavaScriptTemplate = (accountId: string, privateKey: string) => {
    return `const {
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
  const formatAgentResponse = (response: string) => {
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
  };

  // Parse markdown-style formatting for message display
  const parseMarkdown = (text: string) => {
    // Handle **bold** text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br/>');
    
    return text;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    workspaceMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [workspaceMessages])

  // Check for existing credentials on page load
  useEffect(() => {
    const storedAccountId = sessionStorage.getItem("hedera_account_id")
    const storedPrivateKey = sessionStorage.getItem("hedera_private_key")
    const storedAgentSessionId = sessionStorage.getItem("agent_session_id")
    const storedWorkspaceSessionId = sessionStorage.getItem("workspace_session_id")
    
    if (storedAccountId && storedPrivateKey) {
      setAccountId(storedAccountId)
      setPrivateKey(storedPrivateKey)
      setIsConnected(true)
    }

    if (storedAgentSessionId) {
      setAgentSessionId(storedAgentSessionId)
    }

    if (storedWorkspaceSessionId) {
      setWorkspaceSessionId(storedWorkspaceSessionId)
    }
  }, [])

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
      newErrors.privateKey = "Invalid Private Key format (supports 64-char hex or 96-100 char DER format)"
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
    if (!inputValue.trim() || !isConnected) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsLoading(true)

    try {
      // Execute the real agent
      const agentResponse = await executeAgentRequest(currentInput, false)
      setMessages((prev) => [...prev, agentResponse])
      
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
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "I encountered an unexpected error. Please try again.",
        timestamp: new Date(),
        status: "error",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkspaceSendMessage = async () => {
    if (!workspaceInput.trim() || !isConnected) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: workspaceInput,
      timestamp: new Date(),
    }

    setWorkspaceMessages((prev) => [...prev, userMessage])
    const currentInput = workspaceInput
    setWorkspaceInput("")
    setWorkspaceLoading(true)

    try {
      // Execute the real agent for workspace too
      const agentResponse = await executeAgentRequest(currentInput, true)
      setWorkspaceMessages((prev) => [...prev, agentResponse])
    } catch (error) {
      console.error('Workspace message error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "assistant",
        content: "I encountered an error. Please try again.",
        timestamp: new Date(),
        status: "error",
      }
      setWorkspaceMessages((prev) => [...prev, errorMessage])
    } finally {
      setWorkspaceLoading(false)
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
    if (!playgroundCode.trim()) return;
    
    setIsExecuting(true);
    setPlaygroundOutput("🚀 Starting execution...\n");

    try {
      const request: CodeExecutionRequest = {
        code: playgroundCode
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
                            <div 
                              className="text-sm leading-relaxed" 
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                            />
                            
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
                                  <p className="text-xs text-green-700">
                                    Network Fee: {message.transactionData.estimatedCost}
                                  </p>
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
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
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
                <div className="col-span-8 flex flex-col min-h-0 space-y-4">
                  {/* Editor */}
                  <Card className="border-gray-200 flex-1 flex flex-col min-h-0">
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
                            selectOnLineNumbers: true,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Terminal */}
                  <Card className="border-gray-200 h-48 flex flex-col">
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
                      <div className="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <span className="text-sm font-medium text-gray-700">Assistant</span>
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
                                    <div 
                                      className="text-xs leading-relaxed" 
                                      dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                                    />
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
                            Chat
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
                            onChange={(e) => setWorkspaceInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
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
                    Private Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="privateKey"
                      type={showPrivateKey ? "text" : "password"}
                      placeholder="Enter your private key"
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
