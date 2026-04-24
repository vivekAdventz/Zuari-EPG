import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/chatbot_db');
        console.log('Connected');

        const coll = mongoose.connection.db.collection('queryfeedbacks');
        const total = await coll.countDocuments({});
        console.log('Total QueryFeedbacks:', total);

        const withConv = await coll.find({ conversationId: { $ne: null } }).toArray();
        console.log('Feedbacks with non-null convId:', withConv.length);

        if (withConv.length > 0) {
            const first = withConv[0];
            console.log('First convId type:', typeof first.conversationId);
            console.log('First convId value:', first.conversationId);

            const convColl = mongoose.connection.db.collection('conversations');
            const conv = await convColl.findOne({ _id: first.conversationId });
            console.log('Conversation found?', !!conv);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
