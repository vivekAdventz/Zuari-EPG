import mongoose from 'mongoose';

const apiUsageSchema = new mongoose.Schema({
    model: { type: String, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    operation: { type: String, default: 'unknown' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true });

apiUsageSchema.index({ createdAt: -1 });

export default mongoose.model('ApiUsage', apiUsageSchema);
