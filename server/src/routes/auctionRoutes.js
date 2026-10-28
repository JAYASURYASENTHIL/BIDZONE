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
  sellerDecide,
  confirmHandover,
} from '../controllers/auctionController.js';

const router = Router();

// Public routes
router.get('/', getAuctions);
router.get('/:id', getAuctionById);

// Protected routes (requireAuth)
router.post('/', requireAuth, upload.array('images', 5), createAuction);
router.patch('/:id', requireAuth, updateAuction);
router.delete('/:id', requireAuth, cancelAuction);
router.post('/:id/bids', requireAuth, placeBid);
router.post('/:id/decide', requireAuth, sellerDecide);
router.post('/:id/handover', requireAuth, confirmHandover);

export default router;
