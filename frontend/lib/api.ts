const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://buildo-production-8398.up.railway.app';

export interface ChatRequest {
  sessionId: string;
  accountId: string;
  privateKey: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  success: boolean;
  error?: string;
  message?: string;
  transactionData?: {
    action: string;
    estimatedCost: string;
    details: string[];
    transactionHash?: string;
  };
}

export interface CodeExecutionRequest {
  code: string;
}

export interface CodeExecutionResponse {
  output: string;
  exitCode: number;
  success: boolean;
  error?: string;
}

export interface CodeChange {
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

export interface SimpleChatRequest {
  sessionId: string;
  message: string;
  mode?: 'ask' | 'agent'; // ask = general questions, agent = code-focused
  currentCode?: string; // Current code context for agent mode
  terminalOutput?: string; // Terminal output context
}

export interface SimpleChatResponse {
  sessionId: string;
  response: string;
  mode: string;
  success: boolean;
  error?: string; // Add missing error property
  codeChanges?: CodeChange[]; // Auto-applicable code changes
  hasCodeChanges?: boolean; // Quick check for frontend
}

export class AgentAPI {
  static async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
        console.log(request)
        console.log(API_BASE_URL)
      const response = await fetch(`${API_BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error in agent chat:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async clearSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/session/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error clearing session:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async clearAllSessions(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/sessions`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error clearing all sessions:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error executing code:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
}

export class SimpleChatAPI {
  static async chat(request: SimpleChatRequest): Promise<SimpleChatResponse> {
    try {
      console.log('Simple chat request:', request);
      const response = await fetch(`${API_BASE_URL}/agent/simple-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error in simple chat:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async clearSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/agent/simple-chat/clear-session`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error clearing simple chat session:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
}

// ZK Quest API
export interface CompileCircuitRequest {
  circuitCode: string;
  circuitName: string;
}

export interface CompileCircuitResponse {
  message: string;
  circuitName: string;
  artifacts: any;
  success?: boolean;
  error?: string;
}

export interface GenerateProofRequest {
  circuitName: string;
  inputs: Record<string, any>;
}

export interface GenerateProofResponse {
  message: string;
  proof: any;
  publicSignals: any[];
  success?: boolean;
  error?: string;
}

export interface VerifyProofRequest {
  proof: any;
  publicSignals: any[];
  verificationKey: any;
}

export interface VerifyProofResponse {
  message: string;
  valid: boolean;
  success?: boolean;
  error?: string;
}

export class ZkAPI {
  static async compileCircuit(request: CompileCircuitRequest): Promise<CompileCircuitResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/zk/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error compiling circuit:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async generateProof(request: GenerateProofRequest): Promise<GenerateProofResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/zk/generate-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async verifyProof(request: VerifyProofRequest): Promise<VerifyProofResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/zk/verify-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error verifying proof:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static async getLevelTemplate(levelId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/zk/level/${levelId}/template`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting level template:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }
} 