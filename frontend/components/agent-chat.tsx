"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, Trash2, User, Bot, ExternalLink } from "lucide-react"
import { AgentAPI, ChatRequest } from "@/lib/api"

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  accountId: string;
  privateKey: string;
  sessionId: string;
}

export function AgentChat({ accountId, privateKey, sessionId }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const formatAgentResponse = (response: string) => {
    // Clean up the response by removing function calls and formatting
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

  const extractHashScanLinks = (text: string) => {
    const hashscanRegex = /(https:\/\/hashscan\.io\/testnet\/account\/[^\s]+)/g;
    const matches = text.match(hashscanRegex);
    return matches || [];
  };

  const renderMessageContent = (content: string) => {
    const hashscanLinks = extractHashScanLinks(content);
    
    // Helper function to parse markdown-style formatting
    const parseMarkdown = (text: string) => {
      // Handle **bold** text
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Handle line breaks
      text = text.replace(/\n/g, '<br/>');
      
      return text;
    };
    
    if (hashscanLinks.length === 0) {
      return (
        <div 
          className="text-sm leading-relaxed" 
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
      );
    }

    // Split content by HashScan links and render with clickable links
    let parts = [content];
    hashscanLinks.forEach(link => {
      parts = parts.flatMap(part => 
        typeof part === 'string' ? part.split(link) : [part]
      ).reduce((acc, part, index, array) => {
        acc.push(part);
        if (index < array.length - 1 && typeof part === 'string') {
          acc.push(
            <a
              key={`link-${index}`}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium"
            >
              🔗 View on HashScan
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        return acc;
      }, [] as any[]);
    });

    return (
      <div className="text-sm leading-relaxed">
        {parts.map((part, index) => (
          <span key={index}>
            {typeof part === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: parseMarkdown(part) }} />
            ) : (
              part
            )}
          </span>
        ))}
      </div>
    );
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const chatRequest: ChatRequest = {
        sessionId,
        accountId,
        privateKey,
        message: userMessage.content,
      };

      const response = await AgentAPI.chat(chatRequest);

      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formatAgentResponse(response.response),
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Failed to get response from agent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = async () => {
    try {
      await AgentAPI.clearSession(sessionId);
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear session');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Hedera Agent Chat</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSession}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Chat
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Connected as: {accountId} • Session: {sessionId.slice(0, 8)}...
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start a conversation with the Hedera agent!</p>
                <p className="text-sm mt-2">
                  Try: "Get my HBAR balance" or "Create a fungible token called MyToken"
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {renderMessageContent(message.content)}
                    <p className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Agent is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="px-6 pb-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800 text-sm">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="border-t bg-gray-50 p-4">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask the Hedera agent anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 