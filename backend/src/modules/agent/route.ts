import { Router } from 'express';
import { 
  chatWithAgent, 
  simpleChat,
  clearSessionMemory, 
  clearAllSessionMemories,
  clearChatSessionMemory,
  clearAllChatSessionMemories
} from './controller.js';

const router = Router();

// Tool Agent Routes (existing functionality with Hedera tools)
router.post('/chat', chatWithAgent);

// Simple Chat Routes (new functionality - ask/agent modes)
router.post('/simple-chat', simpleChat);

// Simple Chat Session Management
router.delete('/simple-chat/clear-session', (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        success: false
      });
    }

    const cleared = clearChatSessionMemory(sessionId);
    
    res.json({
      message: cleared ? 'Simple chat session memory cleared successfully' : 'Simple chat session not found',
      sessionId,
      success: true
    });
  } catch (error) {
    console.error('Error clearing simple chat session memory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

router.delete('/simple-chat/clear-all-sessions', (req, res) => {
  try {
    clearAllChatSessionMemories();
    
    res.json({
      message: 'All simple chat session memories cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Error clearing all simple chat session memories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

// Tool Agent Session Management
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        success: false
      });
    }

    const cleared = clearSessionMemory(sessionId);
    
    res.json({
      message: cleared ? 'Tool agent session memory cleared successfully' : 'Tool agent session not found',
      sessionId,
      success: true
    });
  } catch (error) {
    console.error('Error clearing tool agent session memory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

router.delete('/sessions', (req, res) => {
  try {
    clearAllSessionMemories();
    
    res.json({
      message: 'All tool agent session memories cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Error clearing all tool agent session memories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

// Simple Chat Session Management
router.delete('/chat-session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        success: false
      });
    }

    const cleared = clearChatSessionMemory(sessionId);
    
    res.json({
      message: cleared ? 'Simple chat session memory cleared successfully' : 'Simple chat session not found',
      sessionId,
      success: true
    });
  } catch (error) {
    console.error('Error clearing simple chat session memory:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

router.delete('/chat-sessions', (req, res) => {
  try {
    clearAllChatSessionMemories();
    
    res.json({
      message: 'All simple chat session memories cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Error clearing all simple chat session memories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

export default router;