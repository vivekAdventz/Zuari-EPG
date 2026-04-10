import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';

// GET /api/hrops/stats
const getHrOpsStats = async (req, res, next) => {
    try {
        const hrOpsId = req.user._id;
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

        const [totalThisWeek, pending, critical, resolved] = await Promise.all([
            Ticket.countDocuments({ assignedTo: hrOpsId, createdAt: { $gte: weekAgo } }),
            Ticket.countDocuments({ assignedTo: hrOpsId, status: { $in: ['open', 'hold'] } }),
            Ticket.countDocuments({ assignedTo: hrOpsId, status: 'open', hrResponse: '', createdAt: { $lte: dayAgo } }),
            Ticket.countDocuments({ assignedTo: hrOpsId, status: 'resolved' }),
        ]);

        res.status(200).json({ statusCode: 200, success: true, data: { totalThisWeek, pending, critical, resolved } });
    } catch (error) {
        next(error);
    }
};

// GET /api/hrops/tickets  (tickets assigned to the logged-in HROps user)
const getAssignedTickets = async (req, res, next) => {
    try {
        const { status, category, startDate, endDate, page = 1, limit = 20 } = req.query;
        const filter = { assignedTo: req.user._id };
        if (status) filter.status = status;
        if (category) filter.theme = category;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const tickets = await Ticket.find(filter)
            .populate('userId', 'name email')
            .populate('theme', 'daysToClosure')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        // Attach unread message counts
        const ticketIds = tickets.map(t => t._id);
        const unreadCounts = await TicketMessage.aggregate([
            { $match: { ticketId: { $in: ticketIds }, senderRole: 'employee', readBy: { $ne: req.user._id } } },
            { $group: { _id: '$ticketId', count: { $sum: 1 } } },
        ]);
        const unreadMap = {};
        unreadCounts.forEach(u => { unreadMap[u._id.toString()] = u.count; });

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
            return {
                ...t,
                unreadMessages: unreadMap[t._id.toString()] || 0,
                daysToClosure: dtc,
                dueDate,
                daysRemaining,
                isOverdue,
            };
        });

        const total = await Ticket.countDocuments(filter);

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

// PATCH /api/hrops/tickets/:id  { status, hrResponse }
const updateAssignedTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, hrResponse } = req.body;

        const ticket = await Ticket.findOne({ _id: id, assignedTo: req.user._id });
        if (!ticket) {
            res.status(404);
            throw new Error('Ticket not found or not assigned to you');
        }

        // Once resolved, status cannot be changed back
        if (ticket.status === 'resolved') {
            res.status(400);
            throw new Error('Resolved tickets cannot be reopened or changed');
        }

        if (status) ticket.status = status;
        if (hrResponse !== undefined) ticket.hrResponse = hrResponse;
        await ticket.save();

        res.status(200).json({ statusCode: 200, success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

// GET /api/hrops/tickets/:id/messages
const getTicketMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findOne({ _id: id, assignedTo: req.user._id }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found or not assigned to you'); }

        const messages = await TicketMessage.find({ ticketId: id }).sort({ createdAt: 1 }).lean();

        // Mark employee messages as read by this HROps user
        await TicketMessage.updateMany(
            { ticketId: id, senderRole: 'employee', readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );

        res.status(200).json({ statusCode: 200, success: true, data: messages });
    } catch (error) {
        next(error);
    }
};

// POST /api/hrops/tickets/:id/messages
const sendTicketMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message, requestUploadType } = req.body;
        const file = req.file;
        
        if (!message?.trim() && !file && !requestUploadType) { res.status(400); throw new Error('Message, attachment, or upload request is required'); }

        const ticket = await Ticket.findOne({ _id: id, assignedTo: req.user._id }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found or not assigned to you'); }

        let attachmentUrl = null;
        let attachmentType = null;
        let attachmentName = null;

        if (file) {
            attachmentUrl = `/api/chat/files/${file.filename}`;
            attachmentName = file.originalname;
            attachmentType = file.mimetype.includes('pdf') ? 'pdf' : 'image';
        }

        let actualMessage = message ? message.trim() : '';
        if (requestUploadType && !actualMessage) {
            actualMessage = `Please upload ${requestUploadType === 'image' ? 'an image' : 'a PDF'} for further conversation.`;
        }

        const msg = await TicketMessage.create({
            ticketId: id,
            senderId: req.user._id,
            senderName: req.user.name,
            senderRole: 'hrOps',
            message: actualMessage,
            attachmentUrl,
            attachmentType,
            attachmentName,
            requestUpload: !!requestUploadType,
            requestUploadType: requestUploadType || null,
            readBy: [req.user._id],
        });

        res.status(201).json({ statusCode: 201, success: true, data: msg });
    } catch (error) {
        next(error);
    }
};

export { getHrOpsStats, getAssignedTickets, updateAssignedTicket, getTicketMessages, sendTicketMessage };
