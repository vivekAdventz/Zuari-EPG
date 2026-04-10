/**
 * Script: Remap references and remove wrong/duplicate QuestionTheme records
 *
 * Step 1: Remaps all references (logs, tickets, users) from wrong themes to correct ones.
 * Step 2: Deletes the now-unreferenced wrong theme records.
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

const REMAP = {
    'Benefits':               'Benefits & Insurance',
    'Offboarding':            'Employee Lifecycle',
    'Onboarding':             'Employee Lifecycle',
    'Leave Policy':           'HR Policies & Guidelines',
    'Travel Policy':          'HR Policies & Guidelines',
    'IT Support':             'HR Systems & Tools',
    'General Inquiry':        'Other / Unclassified',
    'Payroll':                'Payroll & Compensation',
    'Appraisal':              'Performance & Appraisals',
    'Performance Management': 'Performance & Appraisals',
};

const DRY_RUN = process.env.DRY_RUN !== 'false';

const run = async () => {
    await connectDB();
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '  DRY RUN — no changes will be saved' : '  LIVE RUN — changes WILL be applied');
    console.log(`${'='.repeat(60)}\n`);

    const allThemes = await QuestionTheme.find({}).lean();
    const themeByName = {};
    allThemes.forEach(t => { themeByName[t.name] = t; });

    const wrongNames = Object.keys(REMAP);
    const wrongThemes = wrongNames.map(n => themeByName[n]).filter(Boolean);

    if (wrongThemes.length === 0) {
        console.log('No wrong themes found in the database. Nothing to do.');
        await mongoose.connection.close();
        process.exit(0);
    }

    // ── Step 1: Remap references ──────────────────────────────────────────────
    console.log('── Step 1: Remap references ──\n');

    for (const wrongTheme of wrongThemes) {
        const correctName = REMAP[wrongTheme.name];
        const correctTheme = themeByName[correctName];

        if (!correctTheme) {
            console.log(`  ⚠  Target "${correctName}" not found — skipping "${wrongTheme.name}"`);
            continue;
        }

        const wrongId = wrongTheme._id;
        const logCount = await MessageThemeLog.countDocuments({ themeId: wrongId });
        const ticketByIdCount = await Ticket.countDocuments({ theme: wrongId });
        const ticketByNameCount = await Ticket.countDocuments({ themeName: wrongTheme.name, theme: { $ne: correctTheme._id } });
        const users = await User.find({ assignedThemes: wrongId }).lean();

        console.log(`  "${wrongTheme.name}" → "${correctTheme.name}"`);
        console.log(`    ${logCount} logs, ${ticketByIdCount} tickets (by ID), ${ticketByNameCount} tickets (by name), ${users.length} users`);

        if (!DRY_RUN) {
            if (logCount > 0) {
                const r = await MessageThemeLog.updateMany(
                    { themeId: wrongId },
                    { $set: { themeId: correctTheme._id, themeName: correctTheme.name } }
                );
                console.log(`    ✅ Remapped ${r.modifiedCount} logs`);
            }
            if (ticketByIdCount > 0) {
                const r = await Ticket.updateMany(
                    { theme: wrongId },
                    { $set: { theme: correctTheme._id, themeName: correctTheme.name } }
                );
                console.log(`    ✅ Remapped ${r.modifiedCount} tickets (by ID)`);
            }
            if (ticketByNameCount > 0) {
                const r = await Ticket.updateMany(
                    { themeName: wrongTheme.name, theme: { $ne: correctTheme._id } },
                    { $set: { theme: correctTheme._id, themeName: correctTheme.name } }
                );
                console.log(`    ✅ Remapped ${r.modifiedCount} tickets (by name)`);
            }
            for (const user of users) {
                const updated = user.assignedThemes
                    .map(tid => tid.toString() === wrongId.toString() ? correctTheme._id : tid);
                const unique = [...new Set(updated.map(t => t.toString()))].map(id => new mongoose.Types.ObjectId(id));
                await User.findByIdAndUpdate(user._id, { assignedThemes: unique });
            }
            if (users.length > 0) console.log(`    ✅ Remapped ${users.length} user(s)`);
        }
    }

    // ── Step 2: Delete wrong themes ───────────────────────────────────────────
    console.log('\n── Step 2: Delete wrong themes ──\n');

    for (const wrongTheme of wrongThemes) {
        const remaining = {
            logs: await MessageThemeLog.countDocuments({ themeId: wrongTheme._id }),
            tickets: await Ticket.countDocuments({ theme: wrongTheme._id }),
            users: await User.countDocuments({ assignedThemes: wrongTheme._id }),
        };

        if (remaining.logs > 0 || remaining.tickets > 0 || remaining.users > 0) {
            console.log(`  ⚠  "${wrongTheme.name}" still has refs (${remaining.logs} logs, ${remaining.tickets} tickets, ${remaining.users} users) — skipping`);
            continue;
        }

        if (!DRY_RUN) {
            await QuestionTheme.findByIdAndDelete(wrongTheme._id);
            console.log(`  ✅ Deleted "${wrongTheme.name}"`);
        } else {
            console.log(`  🗑  Will delete "${wrongTheme.name}"`);
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
