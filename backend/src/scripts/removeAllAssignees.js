/**
 * Script: Remove all assignees from categories
 *
 * Clears the assignedThemes array from all users who have theme assignments.
 *
 * Run:  node src/scripts/removeAllAssignees.js
 * DRY RUN by default — set DRY_RUN=false to apply changes.
 */

import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const DRY_RUN = process.env.DRY_RUN !== 'false';

const run = async () => {
    await connectDB();
    console.log(`\n${'='.repeat(60)}`);
    console.log(DRY_RUN ? '  DRY RUN — no changes will be saved' : '  LIVE RUN — changes WILL be applied');
    console.log(`${'='.repeat(60)}\n`);

    const usersWithThemes = await User.find({ assignedThemes: { $exists: true, $ne: [] } })
        .select('name email role assignedThemes')
        .populate('assignedThemes', 'name')
        .lean();

    if (usersWithThemes.length === 0) {
        console.log('No users with assigned themes found. Nothing to do.');
        await mongoose.connection.close();
        process.exit(0);
    }

    console.log(`Found ${usersWithThemes.length} user(s) with assigned themes:\n`);

    for (const user of usersWithThemes) {
        const themeNames = user.assignedThemes.map(t => t?.name || 'Unknown').join(', ');
        console.log(`  ${user.name} (${user.email}) [${user.role}]`);
        console.log(`    Themes: ${themeNames}`);
    }

    if (!DRY_RUN) {
        const result = await User.updateMany(
            { assignedThemes: { $exists: true, $ne: [] } },
            { $set: { assignedThemes: [] } }
        );
        console.log(`\n  ✅ Cleared assignedThemes from ${result.modifiedCount} user(s)`);
    }

    console.log(`\n${'='.repeat(60)}`);
    if (DRY_RUN) {
        console.log('  DRY RUN complete. No data was changed.');
        console.log('  To apply: DRY_RUN=false node src/scripts/removeAllAssignees.js');
    } else {
        console.log('  ✅ All category assignments cleared.');
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
