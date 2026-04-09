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
        assignedTo:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        status:             { type: String, enum: ['open', 'hold', 'resolved'], default: 'open' },
        hrResponse:         { type: String, default: '' },
    },
    { timestamps: true }
);

ticketSchema.pre('save', async function () {
    if (!this.ticketNumber) {
        const counter = await Counter.findByIdAndUpdate(
            'ticketNumber',
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.ticketNumber = `#HR-${String(counter.seq).padStart(5, '0')}`;
    }
});

export default mongoose.model('Ticket', ticketSchema);
