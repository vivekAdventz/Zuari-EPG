import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    password: {
      type: String,
      required: false, // Not required since employees use SSO
      select: false, // Don't return by default
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },


    // ── Linked to config collections via ObjectId ─────────────────────────
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Entity',
      default: null
    },

    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImpactLevel',
      default: null
    },

    empCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeCategory',
      default: null
    },

    assignedThemes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionTheme'
      }
    ],

    // ── Kept as plain string for quick access without join ────────────────
    entity_code: {
      type: String,
      default: ''
    },

    is_account_active: {
      type: Boolean,
      default: true
    },
    is_account_activated: {
      type: Boolean,
      default: false
    },

    roles: {
      type: [String],
      enum: ["employee", "admin", "superAdmin", "hrOps"],
      default: ["employee"]
    },

    loginCount: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
