"use client"

import { ExternalLink } from "lucide-react"

interface MessageFormatterProps {
  content: string;
  className?: string;
}

export function MessageFormatter({ content, className = "text-sm leading-relaxed" }: MessageFormatterProps) {
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

  // Extract HashScan links
  const extractHashScanLinks = (text: string) => {
    const hashscanRegex = /(https:\/\/hashscan\.io\/testnet\/account\/[^\s]+)/g;
    const matches = text.match(hashscanRegex);
    return matches || [];
  };

  const renderContent = () => {
    const formattedContent = formatAgentResponse(content);
    const hashscanLinks = extractHashScanLinks(formattedContent);
    
    if (hashscanLinks.length === 0) {
      return (
        <div 
          className={className}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(formattedContent) }}
        />
      );
    }

    // Split content by HashScan links and render with clickable links
    let parts = [formattedContent];
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
      <div className={className}>
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

  return renderContent();
} 