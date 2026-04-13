import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import QuestionTheme from '../models/QuestionTheme.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedTickets = async () => {
    try {
        await connectDB();
        
        console.log('Fetching themes...');
        const themes = await QuestionTheme.find({});
        if (themes.length === 0) {
            console.log('No themes found. Please ingest policies/themes first.');
            process.exit(1);
        }

        let user = await User.findOne({ email: 'vivek.kumar@adventz.com'.toLowerCase() });
        if (!user) {
            console.log('Target user not found! Creating the target user...');
            user = await User.create({
                name: 'Vivek Kumar',
                email: 'vivek.kumar@adventz.com',
                roles: ['employee', 'hrOps', 'admin']
            });
        }

        console.log(`Using user [${user.name}] to seed tickets.`);

        const now = new Date();
        let ticketsCreated = 0;

        for (const theme of themes) {
            console.log(`Seeding tickets for theme: ${theme.name} ...`);
            
            // Standardizing SLA days
            const slaDays = theme.daysToClosure || 2;
            
            // Define 6 scenarios ensuring different statuses and overdue states
            const dummyData = [
                { status: 'open', daysAgo: 0, desc: 'Fresh new ticket just opened.', hrResponse: '' },
                { status: 'open', daysAgo: slaDays + 3, desc: 'Very critical! Waiting on HR for days.', hrResponse: '' }, // Critical & Overdue
                { status: 'hold', daysAgo: 2, desc: 'Providing additional requested ID documents.', hrResponse: 'Please attach ID.' },
                { status: 'hold', daysAgo: slaDays + 10, desc: 'Has my manager approved this yet?', hrResponse: 'Waiting on manager approval.' }, // Overdue hold
                { status: 'resolved', daysAgo: 1, desc: 'Thanks for the fast help!', hrResponse: 'Issue resolved.' },
                { status: 'resolved', daysAgo: 30, desc: 'Old issue from last month.', hrResponse: 'Closed properly.' }
            ];

            for (const [index, data] of dummyData.entries()) {
                const customDate = new Date(now.getTime() - (data.daysAgo * 24 * 60 * 60 * 1000));
                
                const ticket = new Ticket({
                    userId: user._id,
                    userName: user.name,
                    userEmail: user.email,
                    subject: `Dummy Report ${index + 1} - ${theme.name}`,
                    description: data.desc,
                    theme: theme._id,
                    themeName: theme.name,
                    status: data.status,
                    hrResponse: data.hrResponse || '',
                    createdAt: customDate,
                    updatedAt: customDate
                });

                // Use timestamps: false so mongoose doesn't overwrite our fake createdAt dates
                await ticket.save({ timestamps: false });
                ticketsCreated++;
            }
        }

        console.log(`✅ Success! Seeded a total of ${ticketsCreated} dummy tickets with mixed statuses.`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
};

seedTickets();
