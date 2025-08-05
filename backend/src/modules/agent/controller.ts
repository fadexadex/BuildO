import { Request, Response } from 'express';
import { chatWithToolAgent, clearToolAgentMemory, clearAllToolAgentMemories } from './services/toolAgent.js';
import { handleSimpleChat, clearSimpleChatMemory, clearAllSimpleChatMemories } from './services/simpleChat.js';

// Tool Agent Controller (existing functionality)
export async function chatWithAgent(req: Request, res: Response) {
  try {
    const result = await chatWithToolAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in chatWithAgent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
}

// Simple Chat Controller (new functionality)
export async function simpleChat(req: Request, res: Response) {
  try {
    const result = await handleSimpleChat(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in simpleChat:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
}

// Memory management functions for Tool Agent
export function clearSessionMemory(sessionId: string): boolean {
  return clearToolAgentMemory(sessionId);
}

export function clearAllSessionMemories(): void {
  clearAllToolAgentMemories();
}

// Memory management functions for Simple Chat
export function clearChatSessionMemory(sessionId: string): boolean {
  return clearSimpleChatMemory(sessionId);
}

export function clearAllChatSessionMemories(): void {
  clearAllSimpleChatMemories();
}