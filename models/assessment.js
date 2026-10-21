import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["public", "private"],
      required: true
    },

    unit: {
      type: String,
      required: true,
      trim: true
    },

    groups: {
      type: [String],
      required: true
    },

    eligibility: {
      minGPA: {
        type: String,
        required: true
      },
      requiredSubjects: {
        type: [String],
        required: true
      }
    },

    examPattern: {
      mode: {
        type: String,
        required: true
      },
      duration: {
        type: String,
        required: true
      },
      totalMarks: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      negativeMarking: {
        type: String,
        required: true
      },
      questionCount: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    },

    markDistribution: [
      {
        subject: {
          type: String,
          required: true
        },
        marks: {
          type: Number,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default mongoose.model("Assessment", assessmentSchema);