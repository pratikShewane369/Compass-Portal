import express from 'express';
import {
  applyToJob,
  getMyApplications,
  getApplicationById,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', authorize('STUDENT'), applyToJob);
router.get('/my', authorize('STUDENT'), getMyApplications);
router.get('/:id', getApplicationById);
router.patch('/:id/status', authorize('RECRUITER', 'ADMIN', 'STUDENT'), updateApplicationStatus);

export default router;
