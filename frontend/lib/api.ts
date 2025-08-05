const API_BASE_URL = 'http://localhost:3001';

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