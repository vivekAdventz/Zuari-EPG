import mongoose from 'mongoose';

const questionThemeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        exampleQueries: {
            type: String,
            trim: true
        },
        isPredefined: {
            type: Boolean,
            default: false
        },
        // Running total of how many questions have been classified under this theme
        count: {
            type: Number,
            default: 0
        },
        // SLA: number of days allowed to close tickets in this category
        daysToClosure: {
            type: Number,
            default: null
        },
        // Short 2-4 letter code used in ticket number generation: HR-<functionCode>-XXXXX-XXXXX
        functionCode: {
            type: String,
            default: 'OTH',
            uppercase: true,
            trim: true
        }
    },
    { timestamps: true }
);

export const PREDEFINED_THEMES = [
    {
        name: "Leave & Attendance",
        functionCode: "LEV",
        description: "Questions related to leave types, leave balance, sick leave, casual leave, holiday calendars, attendance tracking, and working hours.",
        exampleQueries: '"How many leaves do I have?", "What is sick leave policy?", "Can I carry forward leave?"'
    },
    {
        name: "Payroll & Compensation",
        functionCode: "PAY",
        description: "Questions about salary payments, bonuses, payslips, tax deductions, reimbursements related to pay, and payroll cycles.",
        exampleQueries: '"When will salary be credited?", "Where can I download my payslip?", "Why is tax deducted?"'
    },
    {
        name: "Benefits & Insurance",
        functionCode: "BEN",
        description: "Questions about employee benefits such as medical insurance, wellness benefits, allowances, reimbursements, and coverage details.",
        exampleQueries: '"How do I claim insurance?", "Is dental covered?", "What benefits do employees get?"'
    },
    {
        name: "HR Policies & Guidelines",
        functionCode: "POL",
        description: "Questions requesting clarification about company policies such as work-from-home rules, travel policies, code of conduct, or other HR regulations.",
        exampleQueries: '"What is the WFH policy?", "What is the travel reimbursement policy?"'
    },
    {
        name: "Performance & Appraisals",
        functionCode: "PER",
        description: "Questions related to performance reviews, appraisal cycles, promotions, ratings, and goal-setting processes.",
        exampleQueries: '"When does appraisal happen?", "How are ratings decided?"'
    },
    {
        name: "Recruitment & Referrals",
        functionCode: "REC",
        description: "Questions related to job openings, referral processes, hiring procedures, and interview guidelines.",
        exampleQueries: '"How do I refer a candidate?", "Where can I see open roles?"'
    },
    {
        name: "Learning & Development",
        functionCode: "LND",
        description: "Questions related to training programs, skill development, certifications, leadership programs, and learning platforms.",
        exampleQueries: '"Are there training courses available?", "How do I enroll in leadership training?"'
    },
    {
        name: "Employee Lifecycle",
        functionCode: "ELC",
        description: "Questions related to joining, onboarding, probation, internal transfers, resignation, notice period, and exit processes.",
        exampleQueries: '"What is the notice period?", "How do I apply for internal transfer?"'
    },
    {
        name: "HR Systems & Tools",
        functionCode: "SYS",
        description: "Questions related to HR platforms, employee portals, login issues, updating personal information, or using HR software.",
        exampleQueries: '"I can\'t log into the HR portal", "How do I update my address?"'
    },
    {
        name: "HR Contacts & Support",
        functionCode: "SUP",
        description: "Questions asking who to contact in HR or where to escalate issues.",
        exampleQueries: '"Who is my HRBP?", "How do I contact payroll?"'
    },
    {
        name: "Workplace & Facilities",
        functionCode: "FAC",
        description: "Questions about workplace logistics like office access, ID cards, seating, transport, cafeteria, or facilities.",
        exampleQueries: '"How do I get an ID card?", "Is office transport available?"'
    },
    {
        name: "Other / Unclassified",
        functionCode: "OTH",
        description: "Queries that do not clearly fall into any predefined theme. Used as a fallback category for analytics review.",
        exampleQueries: "Unusual or ambiguous questions"
    }
];

export default mongoose.model('QuestionTheme', questionThemeSchema);
