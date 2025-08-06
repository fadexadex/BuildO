import { Router } from 'express';
import { 
  chatWithAgent, 
  simpleChat,
  clearSessionMemory, 
  clearAllSessionMemories,
  clearChatSessionMemory
} from './controller.js';

const router = Router();

// Tool Agent Routes (existing functionality with Hedera tools)
router.post('/chat', chatWithAgent);

// Simple Chat Routes (new functionality - ask/agent modes)
router.post('/simple-chat', simpleChat);

// Simple Chat Session Management
router.delete('/simple-chat/clear-session', clearChatSessionMemory);

// Tool Agent Session Management
router.delete('/session/:sessionId', clearSessionMemory);
router.delete('/sessions', clearAllSessionMemories);

export default router;