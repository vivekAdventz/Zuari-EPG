import mongoose from "mongoose";

const queryFeedbackSchema = new mongoose.Schema(
    {
        queryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            required: true
        },
        responseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        userEntity: {
            type: String,
        },
        userMail: {
            type: String,
            required: true
        },
        userImpactLevel: {
            type: String,
        },
        userCategory: {
            type: String,
        },
        userQuestion: {
            type: String,
            required: true
        },
        aiResponse: {
            type: String,
            required: true
        },
        thumbs: {
            type: String,
            enum: ['up', 'down'],
            required: true
        },
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation'
        },
        selectedChips: {
            type: [String],
            default: []
        },
        description: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

export default mongoose.model("QueryFeedback", queryFeedbackSchema);
