import { NextFunction, Request, Response } from 'express';
import { chatWithToolAgent, clearToolAgentMemory, clearAllToolAgentMemories } from './services/toolAgent.js';
import { handleSimpleChat, clearSimpleChatMemory, clearAllSimpleChatMemories } from './services/simpleChat.js';
import { handleCircuitDesign } from './services/circuitAgent.js';
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

// Circuit Design Controller
export async function circuitDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, prompt, code } = req.body;
    
    // Validate request
    if (!action) {
      console.error('❌ Circuit Design Error: Missing "action" field in request');
      throw new AppError('Missing required field: "action". Must be "generate" or "explain"', 400);
    }
    
    if (action !== 'generate' && action !== 'explain') {
      console.error(`❌ Circuit Design Error: Invalid action "${action}"`);
      throw new AppError(`Invalid action: "${action}". Must be "generate" or "explain"`, 400);
    }
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('❌ Circuit Design Error: Missing or empty "prompt" field');
      throw new AppError('Missing required field: "prompt". Please provide a description of the circuit or question', 400);
    }
    
    if (action === 'explain' && (!code || typeof code !== 'string' || code.trim() === '')) {
      console.error('❌ Circuit Design Error: Missing "code" field for explain action');
      throw new AppError('Missing required field: "code". When action is "explain", you must provide the circuit code to explain', 400);
    }
    
    console.log(`🔧 Processing circuit design request: ${action} - "${prompt.substring(0, 50)}..."`);
    
    const result = await handleCircuitDesign(req.body);
    
    if (!result.success) {
      console.error('❌ Circuit Design Failed:', result.error);
      throw new AppError(result.error || 'Circuit design generation failed', 500);
    }
    
    console.log('✅ Circuit design completed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error in circuitDesign:', error);
    
    // If it's already an AppError with a status code, pass it through
    if (error instanceof AppError) {
      next(error);
    } else {
      // For unexpected errors, provide more details
      const errorMessage = error instanceof Error ? error.message : 'Circuit design request failed';
      console.error('💥 Unexpected error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace available'
      });
      next(new AppError(errorMessage, 500));
    }
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