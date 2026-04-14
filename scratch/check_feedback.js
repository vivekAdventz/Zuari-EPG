import mongoose from 'mongoose';
import QueryFeedback from '../backend/src/models/QueryFeedback.js';
import Conversation from '../backend/src/models/Conversation.js';
import Message from '../backend/src/models/Message.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hr-chatbot');
    console.log('Connected to DB');

    const feedbacks = await QueryFeedback.find({}).lean();
    console.log('Total Feedbacks:', feedbacks.length);
    console.log('Feedbacks with convId:', feedbacks.filter(f => f.conversationId).length);
    
    if (feedbacks.length > 0) {
        console.log('Sample Feedback:', JSON.stringify(feedbacks[0], null, 2));
    }

    const feedbacksWithConv = await QueryFeedback.find({ conversationId: { $exists: true } }).lean();
    console.log('Query with $exists:', feedbacksWithConv.length);

    process.exit(0);
}

test();
