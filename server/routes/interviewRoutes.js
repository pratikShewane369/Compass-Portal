import express from 'express';
import {
  scheduleInterview,
  getInterviews,
  updateInterview,
} from '../controllers/interviewController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getInterviews);
router.post('/', authorize('RECRUITER', 'ADMIN'), scheduleInterview);
router.put('/:id', authorize('RECRUITER', 'ADMIN'), updateInterview);

export default router;
