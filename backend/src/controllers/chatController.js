import chatService from '../services/chatService.js';
import aiService from '../services/aiService.js';
import { createLog } from '../utils/logger.js';
import { classifyAndRecord } from '../services/themeService.js';
import QueryFeedback from '../models/QueryFeedback.js';
import Ticket from '../models/Ticket.js';

// @desc    Create a new conversation
// @route   POST /api/chat/conversation
// @access  Private
const createConversation = async (req, res, next) => {
    try {
        const { title } = req.body;

        const conversation = await chatService.createNewConversation(req.user._id, title);

        await createLog(req.user._id, req.user.name, req.user.roles?.join(', ') || 'employee', req.user.entity, `Created conversation: ${title}`);

        res.status(201).json({
            statusCode: 201,
            success: true,
            data: conversation
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all conversations for a user
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res, next) => {
    try {
        const conversations = await chatService.getConversations(req.user._id);
        res.status(200).json({
            statusCode: 200,
            success: true,
            data: conversations
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/:id
// @access  Private
const getMessages = async (req, res, next) => {
    try {
        const conversation = await chatService.getConversation(req.params.id);

        if (!conversation) {
            res.status(404);
            throw new Error('Conversation not found');
        }

        // Check ownership
        if (conversation.userId.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Not authorized to view this conversation');
        }

        const messages = await chatService.getMessages(conversation._id);

        // Fetch feedback & ticket state for this conversation's messages
        const messageIds = messages.map(m => m._id);

        const [feedbacks, tickets] = await Promise.all([
            QueryFeedback.find({ responseId: { $in: messageIds } }).select('responseId thumbs').lean(),
            Ticket.find({ responseMessageId: { $in: messageIds }, userId: req.user._id }).select('responseMessageId ticketNumber').lean(),
        ]);

        // Build lookup data
        const feedbackResponseIds = feedbacks.map(f => f.responseId.toString());
        const ticketResponseMap = tickets.map(t => ({ responseId: t.responseMessageId.toString(), ticketNumber: t.ticketNumber }));

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: messages,
            feedbackResponseIds,
            ticketResponseMap,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send a message and get bot response
// @route   POST /api/chat/message
// @access  Private
const sendMessage = async (req, res, next) => {
    try {
        const { conversationId, content, selectedPolicy, isRegenerate } = req.body;

        if (!conversationId || !content) {
            res.status(400);
            throw new Error('Conversation ID and content are required');
        }

        const conversation = await chatService.getConversation(conversationId);

        if (!conversation) {
            res.status(404);
            throw new Error('Conversation not found');
        }

        // Check ownership
        if (conversation.userId.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Not authorized to access this conversation');
        }

        let userMessage = null;

        // 1. Save User Message (unless regenerating)
        if (!isRegenerate) {
            userMessage = await chatService.saveMessage(conversation._id, req.user._id, 'user', content);

            await createLog(req.user._id, req.user.name, req.user.roles?.join(', ') || 'employee', req.user.entity, `Prompted AI: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);

            // 1.5 Fire-and-forget: classify this question into a theme
            try {
                classifyAndRecord({
                    messageId: userMessage._id,
                    userId: req.user._id,
                    conversationId: conversation._id,
                    question: content,
                    entityName: req.user.entity?.name || req.user.entity_code || '',
                    levelName: req.user.level?.name || ''
                }).catch(err => console.error('Theme classification error:', err.message));
            } catch (err) {
                console.error('Theme classification initiation failed:', err.message);
            }
        }

        // 2. Fetch recent context
        let recentMessages = await chatService.getRecentMessages(conversation._id);

        // Fix: When regenerating, remove the most recent AI response from history.
        // This ensures the conversation history passed to Gemini ends with the user's
        // question — otherwise Gemini sees it already answered and returns empty text.
        if (isRegenerate) {
            const lastAiIdx = recentMessages.findIndex(m => m.role === 'ai');
            if (lastAiIdx !== -1) {
                recentMessages = recentMessages.filter((_, i) => i !== lastAiIdx);
            }
        }

        // 2.5 Fetch available policies
        const query = {
            status: 'live',
            $and: [
                {
                    $or: [
                        { entity: { $size: 0 } },
                        { entity: { $exists: false } },
                        { entity: req.user.entity }
                    ]
                },
                {
                    $or: [
                        { empCategory: { $size: 0 } },
                        { empCategory: { $exists: false } },
                        { empCategory: req.user.empCategory }
                    ]
                }
            ]
        };

        if (req.user.level) {
            query.$and.push({
                $or: [
                    { impactLevel: { $size: 0 } },
                    { impactLevel: { $exists: false } },
                    { impactLevel: req.user.level }
                ]
            });
        }
        const availablePoliciesDocs = await Policy.find(query).select('title').sort({ title: 1 });
        const availablePoliciesList = availablePoliciesDocs.map(p => p.title);

        // 3. Generate Bot Response
        const populatedUser = await req.user.populate(['entity', 'level', 'empCategory']);
        const { content: botContent, policyName } = await aiService.generateAIResponse(recentMessages, populatedUser, selectedPolicy, availablePoliciesList);

        // Guard: never save empty content to MongoDB (model requires non-empty string)
        const finalBotContent = botContent || '<p>Sorry, I had trouble generating a response. Please try again.</p>';

        // 4. Save Bot Message
        const botMessage = await chatService.saveMessage(conversation._id, req.user._id, 'ai', finalBotContent, policyName);

        // 5. Update Conversation lastMessage
        await chatService.updateLastMessage(conversation._id, finalBotContent);

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: {
                userMessage,
                botMessage,
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a conversation
// @route   DELETE /api/chat/:id
// @access  Private
const deleteConversation = async (req, res, next) => {
    try {
        const conversation = await chatService.getConversation(req.params.id);

        if (!conversation) {
            res.status(404);
            throw new Error('Conversation not found');
        }

        // Check ownership
        if (conversation.userId.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Not authorized to delete this conversation');
        }

        await chatService.deleteConversation(conversation._id);

        res.status(200).json({
            statusCode: 200,
            success: true,
            message: 'Conversation deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

import Policy from '../models/Policy.js';
import FAQ from '../models/FAQ.js';
import QuestionTheme from '../models/QuestionTheme.js';

// @desc    Get all available policies for an employee
// @route   GET /api/chat/policies
// @access  Private
const getAvailablePolicies = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const user = req.user;

        // Build a query based on the user's metadata. 
        // We assume an empty array means "applicable to all"
        const query = {
            status: 'live',
            $and: [
                {
                    $or: [
                        { entity: { $size: 0 } },
                        { entity: { $exists: false } },
                        { entity: user.entity }
                    ]
                },
                {
                    $or: [
                        { empCategory: { $size: 0 } },
                        { empCategory: { $exists: false } },
                        { empCategory: user.empCategory }
                    ]
                }
            ]
        };

        if (user.level) {
            query.$and.push({
                $or: [
                    { impactLevel: { $size: 0 } },
                    { impactLevel: { $exists: false } },
                    { impactLevel: user.level }
                ]
            });
        }

        const policies = await Policy.find(query)
            .select('-chunks -versions') // Exclude heavy chunks and versions
            .sort({ title: 1 });

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: policies
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get dynamic FAQs based on active policies
// @route   POST /api/chat/faqs
// @access  Private
const getDynamicFAQs = async (req, res, next) => {
    try {
        const { policies } = req.body;
        if (!policies || !Array.isArray(policies) || policies.length === 0) {
            return res.status(400).json({ success: false, message: 'Policies array is required' });
        }

        // Fetch policies matching the provided titles to get their ObjectIds
        const matchedPolicies = await Policy.find({ title: { $in: policies } });
        const policyIds = matchedPolicies.map(p => p._id);

        let faqs = [];

        if (policyIds.length > 0) {
            // Retrieve generated FAQs from database
            const faqDocs = await FAQ.find({ policyId: { $in: policyIds } });
            faqDocs.forEach(faqDoc => {
                if (faqDoc.faqs && faqDoc.faqs.length > 0) {
                    faqs = faqs.concat(faqDoc.faqs);
                }
            });
        }

        // If no FAQs found for these policies, we can just return empty or generic
        res.status(200).json({
            statusCode: 200,
            success: true,
            data: faqs
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get predefined question themes (employee-accessible)
// @route   GET /api/chat/question-themes
// @access  Private
const getEmployeeQuestionThemes = async (req, res, next) => {
    try {
        const themes = await QuestionTheme.find({ isPredefined: true })
            .select('_id name description')
            .sort({ name: 1 })
            .lean();
        res.json({ success: true, data: themes });
    } catch (error) {
        next(error);
    }
};

export {
    createConversation,
    getConversations,
    getMessages,
    sendMessage,
    deleteConversation,
    getAvailablePolicies,
    getDynamicFAQs,
    getEmployeeQuestionThemes
};
