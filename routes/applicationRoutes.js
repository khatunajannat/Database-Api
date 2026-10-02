import express from 'express';
import {
  submitApplication,
  getMyApplications,
  getApplicationById,
  deleteApplication,
} from '../controllers/applicationControllers.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Every application route needs a logged-in user
router.use(verifyToken);

router.post('/', submitApplication);
router.get('/my', getMyApplications); // must stay above '/:id'
router.get('/:id', getApplicationById);
router.delete('/:id', deleteApplication);

export default router;