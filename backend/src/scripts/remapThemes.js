/**
 * Production Migration Script: Remap wrong theme names to correct predefined themes
 *
 * Updates: MessageThemeLog, Ticket, QuestionTheme (counts), User (assignedThemes)
 * Run:  node --loader ts-node/esm src/scripts/remapThemes.js
 *   or: node src/scripts/remapThemes.js  (if using native ESM)
 *
 * DRY RUN by default — set DRY_RUN=false to apply changes.
 */

import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import QuestionTheme from '../models/QuestionTheme.js';
import MessageThemeLog from '../models/MessageThemeLog.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// ── Mapping: wrong theme name → correct predefined theme name ─────────────────
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

const DRY_RUN = process.env.DRY_RUN !== 'false'; // default true

const run = async () => {
    await connectDB();
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '  DRY RUN — no changes will be saved' : '  LIVE RUN — changes WILL be applied');
    console.log(`${'='.repeat(60)}\n`);

    // 1. Build lookup: name → _id for all QuestionThemes
    const allThemes = await QuestionTheme.find({}).lean();
    const themeByName = {};
    allThemes.forEach(t => { themeByName[t.name] = t; });

    // Validate that every target theme exists
    const targetNames = [...new Set(Object.values(REMAP))];
    for (const name of targetNames) {
        if (!themeByName[name]) {
            console.error(`❌ Target theme "${name}" not found in DB. Aborting.`);
            process.exit(1);
        }
    }

    // Validate wrong themes exist (warn if not — might already be cleaned)
    const wrongNames = Object.keys(REMAP);
    for (const name of wrongNames) {
        if (!themeByName[name]) {
            console.warn(`⚠  Wrong theme "${name}" not found in DB — may already be cleaned up. Skipping.`);
        }
    }

    // 2. Build ID→ID mapping for themes that exist
    const idRemap = {}; // { wrongId.toString() : correctThemeDoc }
    const nameRemap = {}; // for themeName string replacements
    for (const [wrongName, correctName] of Object.entries(REMAP)) {
        const wrongTheme = themeByName[wrongName];
        const correctTheme = themeByName[correctName];
        if (wrongTheme && correctTheme) {
            idRemap[wrongTheme._id.toString()] = correctTheme;
            nameRemap[wrongName] = correctName;
        }
    }

    const wrongIds = Object.keys(idRemap).map(id => new mongoose.Types.ObjectId(id));

    // ── 3. Remap MessageThemeLog ──────────────────────────────────────────────
    console.log('── MessageThemeLog ──');
    for (const [wrongIdStr, correctTheme] of Object.entries(idRemap)) {
        const wrongId = new mongoose.Types.ObjectId(wrongIdStr);
        const count = await MessageThemeLog.countDocuments({ themeId: wrongId });
        console.log(`  "${allThemes.find(t => t._id.toString() === wrongIdStr)?.name}" → "${correctTheme.name}"  (${count} records)`);

        if (!DRY_RUN && count > 0) {
            const result = await MessageThemeLog.updateMany(
                { themeId: wrongId },
                { $set: { themeId: correctTheme._id, themeName: correctTheme.name } }
            );
            console.log(`    ✅ Updated ${result.modifiedCount} MessageThemeLog records`);
        }
    }

    // ── 4. Remap Tickets ─────────────────────────────────────────────────────
    console.log('\n── Tickets ──');
    for (const [wrongIdStr, correctTheme] of Object.entries(idRemap)) {
        const wrongId = new mongoose.Types.ObjectId(wrongIdStr);
        const wrongName = allThemes.find(t => t._id.toString() === wrongIdStr)?.name;

        // Match by theme ObjectId OR by themeName string (in case theme ref was null)
        const countById = await Ticket.countDocuments({ theme: wrongId });
        const countByName = await Ticket.countDocuments({ themeName: wrongName, theme: { $ne: correctTheme._id } });

        console.log(`  "${wrongName}" → "${correctTheme.name}"  (${countById} by ID, ${countByName} by name)`);

        if (!DRY_RUN) {
            if (countById > 0) {
                const r1 = await Ticket.updateMany(
                    { theme: wrongId },
                    { $set: { theme: correctTheme._id, themeName: correctTheme.name } }
                );
                console.log(`    ✅ Updated ${r1.modifiedCount} tickets (by theme ID)`);
            }
            if (countByName > 0) {
                const r2 = await Ticket.updateMany(
                    { themeName: wrongName, theme: { $ne: correctTheme._id } },
                    { $set: { theme: correctTheme._id, themeName: correctTheme.name } }
                );
                console.log(`    ✅ Updated ${r2.modifiedCount} tickets (by themeName)`);
            }
        }
    }

    // ── 5. Remap User assignedThemes ──────────────────────────────────────────
    console.log('\n── User assignedThemes ──');
    for (const [wrongIdStr, correctTheme] of Object.entries(idRemap)) {
        const wrongId = new mongoose.Types.ObjectId(wrongIdStr);
        const wrongName = allThemes.find(t => t._id.toString() === wrongIdStr)?.name;
        const usersWithWrong = await User.find({ assignedThemes: wrongId }).lean();

        console.log(`  "${wrongName}" → "${correctTheme.name}"  (${usersWithWrong.length} users)`);

        if (!DRY_RUN && usersWithWrong.length > 0) {
            for (const user of usersWithWrong) {
                const updated = user.assignedThemes
                    .map(tid => tid.toString() === wrongIdStr ? correctTheme._id : tid);
                // Deduplicate
                const unique = [...new Set(updated.map(t => t.toString()))].map(id => new mongoose.Types.ObjectId(id));
                await User.findByIdAndUpdate(user._id, { assignedThemes: unique });
            }
            console.log(`    ✅ Updated ${usersWithWrong.length} user(s)`);
        }
    }

    // ── 6. Recalculate counts on all predefined themes ────────────────────────
    console.log('\n── Recalculate QuestionTheme counts ──');
    const predefined = await QuestionTheme.find({ isPredefined: true }).lean();
    for (const theme of predefined) {
        const actualCount = await MessageThemeLog.countDocuments({ themeId: theme._id });
        console.log(`  "${theme.name}": ${theme.count} → ${actualCount}`);

        if (!DRY_RUN) {
            await QuestionTheme.findByIdAndUpdate(theme._id, { count: actualCount });
        }
    }

    // ── 7. Delete wrong (non-predefined) QuestionTheme records ────────────────
    console.log('\n── Cleanup wrong QuestionTheme records ──');
    const wrongThemeDocs = wrongIds.map(id => allThemes.find(t => t._id.toString() === id.toString())).filter(Boolean);
    for (const wrongTheme of wrongThemeDocs) {
        // Only delete if it's NOT a predefined theme (safety check)
        if (wrongTheme.isPredefined) {
            console.log(`  ⏭  "${wrongTheme.name}" is predefined — skipping delete`);
            continue;
        }

        // Verify no remaining references
        const remainingLogs = await MessageThemeLog.countDocuments({ themeId: wrongTheme._id });
        const remainingTickets = await Ticket.countDocuments({ theme: wrongTheme._id });
        const remainingUsers = await User.countDocuments({ assignedThemes: wrongTheme._id });

        if (remainingLogs > 0 || remainingTickets > 0 || remainingUsers > 0) {
            console.log(`  ⚠  "${wrongTheme.name}" still has references (${remainingLogs} logs, ${remainingTickets} tickets, ${remainingUsers} users) — skipping delete`);
            continue;
        }

        console.log(`  🗑  "${wrongTheme.name}" — no remaining references, will delete`);
        if (!DRY_RUN) {
            await QuestionTheme.findByIdAndDelete(wrongTheme._id);
            console.log(`    ✅ Deleted`);
        }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(60)}`);
    if (DRY_RUN) {
        console.log('  DRY RUN complete. No data was changed.');
        console.log('  To apply changes, run with:  DRY_RUN=false node src/scripts/remapThemes.js');
    } else {
        console.log('  ✅ Migration complete. All themes remapped successfully.');
    }
    console.log(`${'='.repeat(60)}\n`);

    await mongoose.connection.close();
    process.exit(0);
};

run().catch(async (err) => {
    console.error('Migration failed:', err);
    await mongoose.connection.close();
    process.exit(1);
});
