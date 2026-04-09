import express from 'express';
import { getVectorDbData, optimizeVectorDb, getApiUsageStats } from '../controllers/superAdminController.js';
import { getQueryFeedbacks, getUserFeedbacks } from '../controllers/feedbackController.js';
import { getInteractionsAdmin } from '../controllers/interactionsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to ensure user is superAdmin
const superAdmin = (req, res, next) => {
    if (req.user && req.user.roles?.includes('superAdmin')) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as super admin');
    }
};

// Vector DB Visualization
router.get('/vector-db', protect, superAdmin, getVectorDbData);
router.post('/vector-db/optimize', protect, superAdmin, optimizeVectorDb);

// Feedback
router.get('/feedbacks/queries', protect, superAdmin, getQueryFeedbacks);
router.get('/feedbacks/users', protect, superAdmin, getUserFeedbacks);

// User Q&A Interactions
router.get('/interactions', protect, superAdmin, getInteractionsAdmin);

// API Usage & Cost
router.get('/api-cost', protect, superAdmin, getApiUsageStats);

export default router;
