import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    _id:  { type: String, required: true },
    seq:  { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const ticketSchema = new mongoose.Schema(
    {
        ticketNumber:       { type: String, unique: true },
        userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        userName:           { type: String, required: true },
        userEmail:          { type: String, required: true },
        userEntity:         { type: String, default: '' },
        subject:            { type: String, default: '' },
        queryMessageId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
        responseMessageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
        userQuestion:       { type: String, default: '' },
        aiResponse:         { type: String, default: '' },
        description:        { type: String, default: '' },
        theme:              { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionTheme', default: null },
        themeName:          { type: String, default: 'Other / Unclassified' },
        // Stores the resolved function code (e.g. PAY, LEV) for display even if theme is deleted
        themeCode:          { type: String, default: 'OTH' },
        assignedTo:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        status:             { type: String, enum: ['open', 'hold', 'resolved'], default: 'open' },
        hrResponse:         { type: String, default: '' },
    },
    { timestamps: true }
);

ticketSchema.pre('save', async function () {
    if (!this.ticketNumber) {
        // Use the stored themeCode, or fall back to 'OTH'
        const funcCode = (this.themeCode || 'OTH').toUpperCase();

        // Increment two counters atomically:
        // 1. Per-category counter  → position of this ticket within its category
        // 2. Global counter        → overall ticket sequence number
        const [categoryCounter, globalCounter] = await Promise.all([
            Counter.findByIdAndUpdate(
                `ticket:${funcCode}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            ),
            Counter.findByIdAndUpdate(
                'ticketNumber',
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            )
        ]);

        const catSeq    = String(categoryCounter.seq).padStart(5, '0');
        const globalSeq = String(globalCounter.seq).padStart(5, '0');

        // Format: HR-PAY-00001-00001
        this.ticketNumber = `HR-${funcCode}-${catSeq}-${globalSeq}`;
    }
});

export default mongoose.model('Ticket', ticketSchema);
