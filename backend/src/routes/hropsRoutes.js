import express from 'express';
import { getHrOpsStats, getAssignedTickets, updateAssignedTicket, getTicketMessages, sendTicketMessage } from '../controllers/hropsController.js';
import { protect } from '../middleware/authMiddleware.js';
import uploadChatFile from '../middleware/uploadChat.js';

const hrOps = (req, res, next) => {
    if (req.user && req.user.roles?.includes('hrOps')) {
        next();
    } else {
        res.status(403);
        throw new Error('Not authorized as HROps');
    }
};

const router = express.Router();

router.get('/stats', protect, hrOps, getHrOpsStats);
router.get('/tickets', protect, hrOps, getAssignedTickets);
router.patch('/tickets/:id', protect, hrOps, updateAssignedTicket);
router.get('/tickets/:id/messages', protect, hrOps, getTicketMessages);
router.post('/tickets/:id/messages', protect, hrOps, uploadChatFile.single('file'), sendTicketMessage);

export default router;
