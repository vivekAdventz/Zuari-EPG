import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema(
    {
        ticketId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
        senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ['employee', 'hrOps'], required: true },
        message:    { type: String, required: false, trim: true },
        attachmentUrl: { type: String, default: null },
        attachmentType: { type: String, enum: ['image', 'pdf', null], default: null },
        attachmentName: { type: String, default: null },
        requestUpload: { type: Boolean, default: false },
        requestUploadType: { type: String, enum: ['image', 'pdf', null], default: null },
        readBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });

export default mongoose.model('TicketMessage', ticketMessageSchema);
