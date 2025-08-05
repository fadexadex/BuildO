import { Router } from 'express';
import { chatWithAgent, clearSessionMemory, clearAllSessionMemories } from './controller.js';

const router = Router();

router.post('/chat', chatWithAgent);

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
      message: cleared ? 'Session memory cleared successfully' : 'Session not found',
      sessionId,
      success: true
    });
  } catch (error) {
    console.error('Error clearing session memory:', error);
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
      message: 'All session memories cleared successfully',
      success: true
    });
  } catch (error) {
    console.error('Error clearing all session memories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
});

export default router;
