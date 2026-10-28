import { Router } from 'express';
import { handleChatMessage } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat/message (Available to both logged-in users and visitors)
router.post('/message', handleChatMessage);

export default router;
