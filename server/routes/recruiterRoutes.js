import express from 'express';
import {
  getRecruiterDashboard,
  updateRecruiterCompany,
  getRecruiterJobs,
  getJobApplicants,
} from '../controllers/recruiterController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, authorize('RECRUITER', 'ADMIN'));

router.get('/dashboard', getRecruiterDashboard);
router.put('/company', updateRecruiterCompany);
router.get('/jobs', getRecruiterJobs);
router.get('/jobs/:jobId/applicants', getJobApplicants);

export default router;
