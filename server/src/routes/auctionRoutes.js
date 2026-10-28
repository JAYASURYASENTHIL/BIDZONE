import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { upload } from '../config/upload.js';
import {
  createAuction,
  getAuctions,
  getAuctionById,
  placeBid,
  updateAuction,
  cancelAuction,
  closeAuctionEarly,
  sellerDecide,
  confirmHandover,
  shareContactPhone,
  setAutoBid,
} from '../controllers/auctionController.js';
import {
  getAuctionQuestions,
  askQuestion,
  answerQuestion,
} from '../controllers/questionController.js';

const router = Router();

// Public routes
router.get('/', getAuctions);
router.get('/:id', getAuctionById);
router.get('/:id/questions', getAuctionQuestions);

// Protected routes (requireAuth)
router.post('/', requireAuth, upload.array('images', 5), createAuction);
router.patch('/:id', requireAuth, updateAuction);
router.delete('/:id', requireAuth, cancelAuction);
router.post('/:id/bids', requireAuth, placeBid);
router.post('/:id/auto-bid', requireAuth, setAutoBid);
router.post('/:id/close-early', requireAuth, closeAuctionEarly);
router.post('/:id/decide', requireAuth, sellerDecide);
router.post('/:id/handover', requireAuth, confirmHandover);
router.post('/:id/contact-phone', requireAuth, shareContactPhone);
router.post('/:id/questions', requireAuth, askQuestion);
router.post('/:id/questions/:questionId/answer', requireAuth, answerQuestion);

export default router;
