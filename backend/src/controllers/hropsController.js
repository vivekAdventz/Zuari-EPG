import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';

// GET /api/hrops/stats
const getHrOpsStats = async (req, res, next) => {
    try {
        const themeIds = req.user.assignedThemes || [];
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Helper to get stats for a specific point in time
        const getStatsForDate = async (targetDate) => {
            const tickets = await Ticket.find({ 
                theme: { $in: themeIds },
                createdAt: { $lte: targetDate }
            }).populate('theme', 'daysToClosure').lean();

            const total = tickets.length;
            const active = tickets.filter(t => t.status !== 'resolved' || (new Date(t.updatedAt) > targetDate && t.createdAt <= targetDate)).length;
            // Note: the above 'active' logic is tricky for historical snapshots without an audit log. 
            // Simplified: calculate based on current state filtered by creation date.
            
            const activeCount = tickets.filter(t => ['open', 'hold'].includes(t.status)).length;
            const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
            const resRate = total > 0 ? (resolvedCount / total) * 100 : 0;

            let slaFailures = 0;
            let backlog = 0;

            tickets.forEach(t => {
                const slaDays = t.theme?.daysToClosure || 2;
                const slaMs = slaDays * 24 * 60 * 60 * 1000;
                const isOverdue = (targetDate - new Date(t.createdAt)) > slaMs;

                if (isOverdue) {
                    if (t.status !== 'resolved') {
                        backlog++;
                        slaFailures++;
                    } else if (new Date(t.updatedAt) - new Date(t.createdAt) > slaMs) {
                        slaFailures++;
                    }
                }
            });

            return { activeCount, resRate, slaFailures, backlog };
        };

        const current = await getStatsForDate(now);
        const previous = await getStatsForDate(lastWeek);

        const calculateChange = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const data = {
            activeTickets: {
                value: current.activeCount,
                change: calculateChange(current.activeCount, previous.activeCount)
            },
            resolutionRate: {
                value: current.resRate.toFixed(1) + '%',
                change: calculateChange(current.resRate, previous.resRate)
            },
            slaCompliance: {
                value: current.slaFailures,
                change: calculateChange(current.slaFailures, previous.slaFailures)
            },
            backlog: {
                value: current.backlog,
                change: calculateChange(current.backlog, previous.backlog)
            }
        };

        res.status(200).json({ statusCode: 200, success: true, data });
    } catch (error) {
        next(error);
    }
};

// GET /api/hrops/tickets  (tickets assigned to the logged-in HROps user)
const getAssignedTickets = async (req, res, next) => {
    try {
        const { status, category, startDate, endDate, page = 1, limit = 20, search } = req.query;
        const themeIds = req.user.assignedThemes || [];
        const filter = { theme: { $in: themeIds } };

        if (status) filter.status = status;
        if (category) filter.theme = category;

        // Date range
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(`${startDate}T00:00:00`);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(`${endDate}T23:59:59.999`);
            }
        }

        // Search in employee name, subject or description
        if (search) {
            const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
            const userIds = matchingUsers.map(u => u._id);
            
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { userId: { $in: userIds } },
                    { description: { $regex: search, $options: 'i' } },
                    { subject: { $regex: search, $options: 'i' } },
                    { ticketNumber: { $regex: search, $options: 'i' } }
                ]
            });
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
        const themeIds = req.user.assignedThemes || [];

        const ticket = await Ticket.findOne({ _id: id, theme: { $in: themeIds } });
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
        const themeIds = req.user.assignedThemes || [];
        const ticket = await Ticket.findOne({ _id: id, theme: { $in: themeIds } }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found or not assigned to your categories'); }

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
        const themeIds = req.user.assignedThemes || [];
        
        if (!message?.trim() && !file && !requestUploadType) { res.status(400); throw new Error('Message, attachment, or upload request is required'); }

        const ticket = await Ticket.findOne({ _id: id, theme: { $in: themeIds } }).lean();
        if (!ticket) { res.status(404); throw new Error('Ticket not found or not assigned to your categories'); }

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
