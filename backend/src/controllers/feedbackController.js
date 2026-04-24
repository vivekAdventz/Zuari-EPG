import QueryFeedback from '../models/QueryFeedback.js';
import UserFeedback from '../models/UserFeedback.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';
import QuestionTheme from '../models/QuestionTheme.js';
import aiService from '../services/aiService.js';

// @desc    Submit feedback for an AI response (Query-level)
// @route   POST /api/chat/feedback
// @access  Private
const submitFeedback = async (req, res, next) => {
    try {
        let { queryId, responseId, userQuestion, aiResponse, thumbs, description, conversationId, selectedChips } = req.body;

        // Fallback: If conversationId is missing, look it up from the message record
        if (!conversationId && (queryId || responseId)) {
            const linkedMsg = await Message.findById(queryId || responseId);
            if (linkedMsg) {
                conversationId = linkedMsg.conversationId;
            }
        }

        if (!queryId || !responseId || !userQuestion || !aiResponse || !thumbs) {
            res.status(400);
            throw new Error('queryId, responseId, userQuestion, aiResponse and thumbs are required');
        }

        // Check for existing feedback by this user for this response
        const existingFeedback = await QueryFeedback.findOne({
            responseId,
            userMail: req.user.email
        });

        if (existingFeedback) {
            // If the same thumb is clicked, treat as toggle off -> DELETE
            if (existingFeedback.thumbs === thumbs) {
                await QueryFeedback.findByIdAndDelete(existingFeedback._id);
                return res.status(200).json({
                    statusCode: 200,
                    success: true,
                    message: 'Feedback removed',
                    data: null
                });
            } else {
                // If different thumb, UPDATE
                existingFeedback.thumbs = thumbs;
                existingFeedback.description = description !== undefined ? description : existingFeedback.description;
                existingFeedback.conversationId = conversationId || existingFeedback.conversationId;
                existingFeedback.selectedChips = selectedChips !== undefined ? selectedChips : existingFeedback.selectedChips;
                await existingFeedback.save();
                return res.status(200).json({
                    statusCode: 200,
                    success: true,
                    data: existingFeedback
                });
            }
        }

        // Populate entity, level, empCategory for readable names
        const populatedUser = await User.findById(req.user._id)
            .populate('entity', 'name')
            .populate('level', 'name')
            .populate('empCategory', 'name');

        const feedback = await QueryFeedback.create({
            queryId,
            responseId,
            userName: req.user.name,
            userMail: req.user.email,
            userEntity: populatedUser?.entity?.name || req.user.entity_code || '',
            userImpactLevel: populatedUser?.level?.name || '',
            userCategory: populatedUser?.empCategory?.name || '',
            userQuestion,
            aiResponse,
            thumbs,
            conversationId,
            selectedChips: selectedChips || [],
            description: description || ''
        });

        res.status(201).json({
            statusCode: 201,
            success: true,
            data: feedback
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit general user feedback (Sentiment-level)
// @route   POST /api/chat/user-feedback
// @access  Private
const submitGeneralFeedback = async (req, res, next) => {
    try {
        const { rating, category, improvementAreas, successAreas, comment } = req.body;

        if (!rating) {
            res.status(400);
            throw new Error('rating is required');
        }

        const populatedUser = await User.findById(req.user._id)
            .populate('entity', 'name')
            .populate('level', 'name');

        const feedback = await UserFeedback.create({
            user: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            userEntity: populatedUser?.entity?.name || req.user.entity_code || '',
            userImpactLevel: populatedUser?.level?.name || '',
            rating,
            category: category || improvementAreas?.[0] || 'Other',
            improvementAreas: improvementAreas || [],
            successAreas: successAreas || [],
            comment: comment || ''
        });

        res.status(201).json({
            statusCode: 201,
            success: true,
            data: feedback
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all query feedbacks (admin)
const getQueryFeedbacks = async (req, res, next) => {
    try {
        const { thumbs, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (thumbs) filter.thumbs = thumbs;

        const feedbacks = await QueryFeedback.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await QueryFeedback.countDocuments(filter);

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: feedbacks,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all general user feedbacks (admin)
const getUserFeedbacks = async (req, res, next) => {
    try {
        const { category, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (category) filter.category = category;

        const feedbacks = await UserFeedback.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await UserFeedback.countDocuments(filter);

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: feedbacks,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/raise-ticket
// Supports both chat-based tickets (with queryId/aiResponse) and independent tickets (with subject/category)
const raiseTicket = async (req, res, next) => {
    try {
        const { queryId, responseId, userQuestion, aiResponse, description, subject, categoryId } = req.body;

        // For chat-based tickets, userQuestion + aiResponse are required
        // For independent tickets, subject + description are required
        const isChatTicket = !!(userQuestion && aiResponse);
        const isIndependentTicket = !!subject;

        if (!isChatTicket && !isIndependentTicket) {
            res.status(400);
            throw new Error('Either (userQuestion + aiResponse) for chat tickets or (subject) for independent tickets is required');
        }

        // 25-word minimum check
        const descToCheck = description || (isChatTicket ? userQuestion : '');
        const wordCount = descToCheck.trim().split(/\s+/).filter(w => w.length > 0).length;
        if (wordCount < 25) {
            res.status(400);
            throw new Error(`Ticket description must be at least 25 words (current: ${wordCount})`);
        }

        // Classify: use userQuestion for chat tickets, or subject+description for independent
        const textToClassify = isChatTicket ? userQuestion : `${subject} ${description || ''}`;

        const allThemes = await QuestionTheme.find({ isPredefined: true })
            .select('name description exampleQueries')
            .lean();

        let themeDoc = null;

        // If categoryId provided (independent ticket), use it directly
        if (categoryId) {
            themeDoc = await QuestionTheme.findById(categoryId).lean();
        }

        // Otherwise, classify via AI
        if (!themeDoc) {
            const classifyResult = await aiService.classifyQuestionTheme(textToClassify, allThemes);
            if (classifyResult?.theme) {
                themeDoc = await QuestionTheme.findOne({ name: classifyResult.theme, isPredefined: true }).lean();
            }
        }
        // Fallback to 'Other / Unclassified'
        if (!themeDoc) {
            themeDoc = await QuestionTheme.findOne({ name: 'Other / Unclassified', isPredefined: true }).lean();
        }

        const themeName = themeDoc?.name || 'Other / Unclassified';
 
        // Create ticket
        const populatedUser = await User.findById(req.user._id).populate('entity', 'name').lean();
 
        const ticket = await Ticket.create({
            userId:            req.user._id,
            userName:          req.user.name,
            userEmail:         req.user.email,
            userEntity:        populatedUser?.entity?.name || req.user.entity_code || '',
            subject:           subject || (isChatTicket ? userQuestion.substring(0, 100) : ''),
            queryMessageId:    queryId || null,
            responseMessageId: responseId || null,
            userQuestion:      userQuestion || '',
            aiResponse:        aiResponse || '',
            description:       description || '',
            theme:             themeDoc?._id || null,
            themeName,
            themeCode:         themeDoc?.functionCode || 'OTH',
            status:            'open',
        });

        // Auto-create the first chat message from the ticket description/question
        const firstMessage = description || userQuestion || subject || '';
        if (firstMessage.trim()) {
            await TicketMessage.create({
                ticketId:   ticket._id,
                senderId:   req.user._id,
                senderName: req.user.name,
                senderRole: 'employee',
                message:    firstMessage.trim(),
                readBy:     [req.user._id],
            });
        }

        res.status(201).json({ statusCode: 201, success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

// GET /api/chat/my-tickets
const getMyTickets = async (req, res, next) => {
    try {
        const { status, theme, search, startDate, endDate, page = 1, limit = 20 } = req.query;
        const filter = { userId: req.user._id };
        if (status) filter.status = status;
        if (theme) filter.theme = theme;
        
        if (search) {
            filter.ticketNumber = { $regex: search, $options: 'i' };
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            if (endDate) filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
        }

        const tickets = await Ticket.find(filter)
            .populate('theme', 'daysToClosure')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        const total = await Ticket.countDocuments(filter);

        // Get unread message counts (hrOps messages not read by employee)
        const ticketIds = tickets.map(t => t._id);
        const unreadCounts = await TicketMessage.aggregate([
            { $match: { ticketId: { $in: ticketIds }, senderRole: 'hrOps', readBy: { $ne: req.user._id } } },
            { $group: { _id: '$ticketId', count: { $sum: 1 } } },
        ]);
        const unreadMap = {};
        for (const u of unreadCounts) unreadMap[u._id.toString()] = u.count;

        // Enrich with SLA data + unread count
        const now = new Date();
        const enriched = tickets.map(t => {
            const dtc = t.theme?.daysToClosure || null;
            let dueDate = null;
            let daysRemaining = null;
            let isOverdue = false;
            if (dtc && t.status !== 'hold') {
                dueDate = new Date(new Date(t.createdAt).getTime() + dtc * 86400000);
                daysRemaining = Math.ceil((dueDate - now) / 86400000);
                isOverdue = daysRemaining < 0 && t.status !== 'resolved';
            }
            return { ...t, daysToClosure: dtc, dueDate, daysRemaining, isOverdue, unreadMessages: unreadMap[t._id.toString()] || 0 };
        });

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: enriched,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/chat/tickets/:id/messages  (employee views chat for their own ticket)
const getEmployeeTicketMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findOne({ _id: id, userId: req.user._id }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found'); }

        const messages = await TicketMessage.find({ ticketId: id }).sort({ createdAt: 1 }).lean();

        // Mark hrOps messages as read
        await TicketMessage.updateMany(
            { ticketId: id, senderRole: 'hrOps', readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );

        res.status(200).json({ statusCode: 200, success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/tickets/:id/messages  (employee sends a message)
const sendEmployeeTicketMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const file = req.file;

        if (!message?.trim() && !file) { res.status(400); throw new Error('Message or attachment is required'); }

        const ticket = await Ticket.findOne({ _id: id, userId: req.user._id }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found'); }
        if (ticket.status === 'resolved') { res.status(400); throw new Error('Cannot send message on a resolved ticket'); }

        // Employee can only reply after HROps has sent at least one message
        const hrOpsMessage = await TicketMessage.findOne({ ticketId: id, senderRole: 'hrOps' }).lean();
        if (!hrOpsMessage) { res.status(400); throw new Error('You can reply once HROps responds to your ticket'); }

        let attachmentUrl = null;
        let attachmentType = null;
        let attachmentName = null;

        if (file) {
            attachmentUrl = `/api/chat/files/${file.filename}`;
            attachmentName = file.originalname;
            attachmentType = file.mimetype.includes('pdf') ? 'pdf' : 'image';
        }

        const msg = await TicketMessage.create({
            ticketId: id,
            senderId: req.user._id,
            senderName: req.user.name,
            senderRole: 'employee',
            message: message ? message.trim() : '',
            attachmentUrl,
            attachmentType,
            attachmentName,
            readBy: [req.user._id],
        });

        res.status(201).json({ statusCode: 201, success: true, data: msg });
    } catch (error) {
        next(error);
    }
};

// @desc    Get conversations with their feedback for admin analysis
// @route   GET /api/admin/conversations-feedback
// @access  Private/Admin
const getConversationsWithFeedback = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        // Find recent QueryFeedback entries that have a valid conversationId and thumbs down
        const feedbacks = await QueryFeedback.find({ 
            conversationId: { $ne: null, $exists: true },
            thumbs: 'down'
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        // Get unique conversation IDs from these feedbacks (safely)
        const conversationIds = [...new Set(feedbacks
            .filter(f => f.conversationId)
            .map(f => f.conversationId.toString())
        )];

        // Fetch conversations and their messages
        const conversations = await Promise.all(conversationIds.map(async (id) => {
            const [conv, messages, allFeedback] = await Promise.all([
                Conversation.findById(id).lean(),
                Message.find({ conversationId: id }).sort({ createdAt: 1 }).lean(),
                QueryFeedback.find({ conversationId: id }).lean()
            ]);

            if (!conv) return null;

            return {
                ...conv,
                messages,
                feedbackRecords: allFeedback
            };
        }));

        const filtered = conversations.filter(c => c !== null);

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: filtered
        });
    } catch (error) {
        next(error);
    }
};

export { 
    submitFeedback, 
    submitGeneralFeedback, 
    getQueryFeedbacks, 
    getUserFeedbacks, 
    raiseTicket, 
    getMyTickets, 
    getEmployeeTicketMessages, 
    sendEmployeeTicketMessage,
    getConversationsWithFeedback 
};

