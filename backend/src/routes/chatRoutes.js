import express from 'express';
import path from 'path';
import fs from 'fs';
import {
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    deleteConversation,
    getAvailablePolicies,
    getDynamicFAQs,
    getEmployeeQuestionThemes
} from '../controllers/chatController.js';
import { submitFeedback, submitGeneralFeedback, raiseTicket, getMyTickets, getEmployeeTicketMessages, sendEmployeeTicketMessage } from '../controllers/feedbackController.js';
import { evaluateTicket, evaluateIndependentTicket } from '../controllers/ticketController.js';
import { protect } from '../middleware/authMiddleware.js';
import uploadChatFile from '../middleware/uploadChat.js';

const router = express.Router();

router.post('/conversation', protect, createConversation);
router.get('/conversations', protect, getConversations);
router.get('/policies', protect, getAvailablePolicies);
router.post('/faqs', protect, getDynamicFAQs);
router.get('/question-themes', protect, getEmployeeQuestionThemes);
router.post('/message', protect, sendMessage);
router.post('/feedback', protect, submitFeedback);
router.post('/user-feedback', protect, submitGeneralFeedback);
router.post('/evaluate-ticket', protect, evaluateTicket);
router.post('/evaluate-independent-ticket', protect, evaluateIndependentTicket);
router.post('/raise-ticket', protect, raiseTicket);
router.get('/my-tickets', protect, getMyTickets);
router.get('/tickets/:id/messages', protect, getEmployeeTicketMessages);
router.post('/tickets/:id/messages', protect, uploadChatFile.single('file'), sendEmployeeTicketMessage);

// Secure file serving - authenticated users only
router.get('/files/:filename', protect, (req, res) => {
    const filename = path.basename(req.params.filename); // prevent path traversal
    const filePath = path.join(process.cwd(), 'uploads', 'chat', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(filePath);
});

router.get('/:id', protect, getMessages);
router.delete('/:id', protect, deleteConversation);

export default router;
