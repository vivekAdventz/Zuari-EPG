import connectDB from '../config/db.js';
import QuestionTheme, { PREDEFINED_THEMES } from '../models/QuestionTheme.js';

const run = async () => {
    await connectDB();
    
    for (const theme of PREDEFINED_THEMES) {
        await QuestionTheme.findOneAndUpdate(
            { name: theme.name },
            { 
                $set: {
                    description: theme.description,
                    exampleQueries: theme.exampleQueries,
                    functionCode: theme.functionCode,
                    isPredefined: true
                }
            },
            { upsert: true }
        );
    }
    console.log(`✅ Seeded/Updated ${PREDEFINED_THEMES.length} predefined question categories`);
    const all = await QuestionTheme.find({}).lean();
    console.log('Current themes in DB:');
    all.forEach(t => console.log(`  - ${t.name} (${t.functionCode})`));
    process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
