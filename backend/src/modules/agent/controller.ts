import { NextFunction, Request, Response } from 'express';
import { chatWithToolAgent, clearToolAgentMemory, clearAllToolAgentMemories } from './services/toolAgent.js';
import { handleSimpleChat, clearSimpleChatMemory, clearAllSimpleChatMemories } from './services/simpleChat.js';
import { AppError } from '../../middlewares/error.handler.js';

// Tool Agent Controller (existing functionality)
export async function chatWithAgent(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await chatWithToolAgent(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in chatWithAgent:', error);
    next(new AppError(
      error instanceof Error ? error.message : 'Tool agent request failed',
      500
    ));
  }
}

// Simple Chat Controller (new functionality)
export async function simpleChat(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await handleSimpleChat(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in simpleChat:', error);
    next(new AppError(
      error instanceof Error ? error.message : 'Simple chat request failed',
      500
    ));
  }
}

// Memory management functions for Tool Agent
export async function clearSessionMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      throw new AppError('Session ID is required', 400);
    }
    
    const result = clearToolAgentMemory(sessionId);
    res.json({ 
      success: result,
      message: result ? 'Session cleared successfully' : 'Session not found'
    });
  } catch (error) {
    console.error('Error in clearSessionMemory:', error);
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to clear session',
      500
    ));
  }
}

export async function clearAllSessionMemories(req: Request, res: Response, next: NextFunction) {
  try {
    clearAllToolAgentMemories();
    res.json({ 
      success: true,
      message: 'All sessions cleared successfully'
    });
  } catch (error) {
    console.error('Error in clearAllSessionMemories:', error);
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to clear all sessions',
      500
    ));
  }
}

// Memory management functions for Simple Chat
export async function clearChatSessionMemory(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      throw new AppError('Session ID is required', 400);
    }
    
    const result = clearSimpleChatMemory(sessionId);
    res.json({ 
      success: result,
      message: result ? 'Chat session cleared successfully' : 'Chat session not found'
    });
  } catch (error) {
    console.error('Error in clearChatSessionMemory:', error);
    next(new AppError(
      error instanceof Error ? error.message : 'Failed to clear chat session',
      500
    ));
  }
}

export function clearAllChatSessionMemories(): void {
  clearAllSimpleChatMemories();
}