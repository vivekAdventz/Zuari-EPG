import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Load from root or parent

const queryFeedbackSchema = new mongoose.Schema({
    conversationId: mongoose.Schema.Types.ObjectId,
    thumbs: String,
}, { strict: false });

const QueryFeedback = mongoose.model('QueryFeedback_test', queryFeedbackSchema, 'queryfeedbacks');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hr-chatbot');
        console.log('Connected');

        const total = await QueryFeedback.countDocuments({});
        console.log('Total QueryFeedbacks:', total);

        const withConv = await QueryFeedback.find({ conversationId: { $ne: null, $exists: true } }).lean();
        console.log('Feedbacks with convId:', withConv.length);

        if (withConv.length > 0) {
            const first = withConv[0];
            console.log('First with convId:', { id: first._id, convId: first.conversationId });
            
            const conversationSchema = new mongoose.Schema({}, { strict: false });
            const Conversation = mongoose.model('Conversation_test', conversationSchema, 'conversations');
            
            const conv = await Conversation.findById(first.conversationId);
            console.log('Conversation found?', !!conv);
            if (conv) {
                console.log('Conversation title:', conv.title);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
