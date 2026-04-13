import Ticket from '../models/Ticket.js';
import TicketMessage from '../models/TicketMessage.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const deleteAllTickets = async () => {
    try {
        await connectDB();
        
        console.log('Deleting all ticket messages...');
        const msgResult = await TicketMessage.deleteMany({});
        console.log(`✅ ${msgResult.deletedCount} ticket messages deleted.`);

        console.log('Deleting all tickets...');
        const ticketResult = await Ticket.deleteMany({});
        console.log(`✅ ${ticketResult.deletedCount} tickets deleted.`);

        // Access the Counter model used in Ticket.js
        // Since it's attached to mongoose.models, we can retrieve it or define it
        const counterSchema = new mongoose.Schema({
            _id:  { type: String, required: true },
            seq:  { type: Number, default: 0 },
        });
        const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
        
        console.log('Resetting ticket counter...');
        await Counter.findByIdAndUpdate('ticketNumber', { seq: 0 }, { upsert: true });
        console.log('✅ Ticket counter reset to 0 (#HR-00001 will be next).');

        console.log('--- Cleanup complete ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
};

deleteAllTickets();
