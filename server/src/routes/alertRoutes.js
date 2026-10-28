import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import {
  getMyAlerts,
  createAlert,
  deleteAlert,
} from '../controllers/alertController.js';

const router = Router();

router.use(requireAuth);

router.get('/', getMyAlerts);
router.post('/', createAlert);
router.delete('/:id', deleteAlert);

export default router;
