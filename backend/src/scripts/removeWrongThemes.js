/**
 * Script: Remove wrong/duplicate QuestionTheme records
 *
 * Deletes non-predefined themes that were created by AI classification
 * but don't match the predefined theme names.
 *
 * Run:  node src/scripts/removeWrongThemes.js
 * DRY RUN by default — set DRY_RUN=false to apply changes.
 */

import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import QuestionTheme from '../models/QuestionTheme.js';
import MessageThemeLog from '../models/MessageThemeLog.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

const THEMES_TO_REMOVE = [
    'Benefits',
    'Offboarding',
    'Onboarding',
    'Leave Policy',
    'Travel Policy',
    'IT Support',
    'General Inquiry',
    'Payroll',
    'Appraisal',
    'Performance Management',
];

const DRY_RUN = process.env.DRY_RUN !== 'false';

const run = async () => {
    await connectDB();
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '  DRY RUN — no changes will be saved' : '  LIVE RUN — changes WILL be applied');
    console.log(`${'='.repeat(60)}\n`);

    const themes = await QuestionTheme.find({ name: { $in: THEMES_TO_REMOVE } }).lean();

    if (themes.length === 0) {
        console.log('No matching themes found in the database. Nothing to do.');
        await mongoose.connection.close();
        process.exit(0);
    }

    console.log(`Found ${themes.length} theme(s) to remove:\n`);

    for (const theme of themes) {
        const logCount = await MessageThemeLog.countDocuments({ themeId: theme._id });
        const ticketCount = await Ticket.countDocuments({ theme: theme._id });
        const userCount = await User.countDocuments({ assignedThemes: theme._id });

        console.log(`  "${theme.name}" (${theme._id})`);
        console.log(`    isPredefined: ${theme.isPredefined}`);
        console.log(`    References: ${logCount} logs, ${ticketCount} tickets, ${userCount} users`);

        if (logCount > 0 || ticketCount > 0 || userCount > 0) {
            console.log(`    ⚠  Has remaining references — skipping (run remapThemes.js first)`);
            continue;
        }

        if (!DRY_RUN) {
            await QuestionTheme.findByIdAndDelete(theme._id);
            console.log(`    ✅ Deleted`);
        } else {
            console.log(`    🗑  Will be deleted`);
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    if (DRY_RUN) {
        console.log('  DRY RUN complete. No data was changed.');
        console.log('  To apply: DRY_RUN=false node src/scripts/removeWrongThemes.js');
    } else {
        console.log('  ✅ Cleanup complete.');
    }
    console.log(`${'='.repeat(60)}\n`);

    await mongoose.connection.close();
    process.exit(0);
};

run().catch(async (err) => {
    console.error('Script failed:', err);
    await mongoose.connection.close();
    process.exit(1);
});
