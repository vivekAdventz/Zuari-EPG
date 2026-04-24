import QuestionTheme from '../models/QuestionTheme.js';
import MessageThemeLog from '../models/MessageThemeLog.js';
import aiService from './aiService.js';


// ── Classify a question and record the result ─────────────────────────────────
export const classifyAndRecord = async ({
    messageId,
    userId,
    conversationId,
    question,
    entityName = '',
    levelName = '',
    policyName = ''
}) => {
    try {
      
        // 1. Fetch all current predefined themes with definition and examples
        const allThemes = await QuestionTheme.find({ isPredefined: true })
            .select('name description exampleQueries')
            .lean();

        // 2. Ask Gemini to classify
        const result = await aiService.classifyQuestionTheme(question, allThemes);
        if (!result || !result.theme) {
            console.warn('classifyAndRecord: Gemini returned no theme for:', question.substring(0, 60));
            return;
        }

        // 3. Increment count on mapped theme
        let theme = await QuestionTheme.findOneAndUpdate(
            { name: result.theme, isPredefined: true },
            { $inc: { count: 1 } },
            { new: true }
        );

        // Fallback if Gemini hallucinated a name
        if (!theme) {
            theme = await QuestionTheme.findOneAndUpdate(
                { name: 'Other / Unclassified' },
                {
                    $setOnInsert: { name: 'Other / Unclassified', isPredefined: true },
                    $inc: { count: 1 }
                },
                { upsert: true, new: true }
            );
        }

        // 4. Write the log entry
        await MessageThemeLog.create({
            messageId,
            userId,
            conversationId,
            themeId: theme._id,
            themeName: theme.name,
            question,
            entity: entityName,
            level: levelName,
            policyName
        });

    } catch (err) {
        // Never throw — this runs fire-and-forget and must not crash the chat
        console.error('classifyAndRecord error:', err.message);
    }
};


