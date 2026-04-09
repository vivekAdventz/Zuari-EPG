import aiService from '../services/aiService.js';

// POST /api/chat/evaluate-ticket
// Uses Gemini Flash 2.5 to evaluate whether raising a ticket is necessary
const evaluateTicket = async (req, res, next) => {
    try {
        const { conversationMessages, userQuestion, aiResponse, selectedPolicy } = req.body;
        console.log(req.body)

        if (!userQuestion || !aiResponse) {
            res.status(400);
            throw new Error('userQuestion and aiResponse are required');
        }

        const evaluation = await aiService.evaluateTicketNecessity(
            conversationMessages || [],
            userQuestion,
            aiResponse,
            req.user,
            selectedPolicy || null
        );

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: evaluation,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/chat/evaluate-independent-ticket
// Evaluates whether an independent ticket (no chat context) needs human intervention
const evaluateIndependentTicket = async (req, res, next) => {
    try {
        const { subject, description } = req.body;

        if (!subject || !description) {
            res.status(400);
            throw new Error('subject and description are required');
        }

        const evaluation = await aiService.evaluateIndependentTicket(
            subject,
            description,
            req.user
        );

        res.status(200).json({
            statusCode: 200,
            success: true,
            data: evaluation,
        });
    } catch (error) {
        next(error);
    }
};

export { evaluateTicket, evaluateIndependentTicket };
