import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { getBuyerDashboard, getSellerDashboard } from '../controllers/auctionController.js';

const router = Router();

router.get('/buyer', requireAuth, getBuyerDashboard);
router.get('/seller', requireAuth, getSellerDashboard);

export default router;
