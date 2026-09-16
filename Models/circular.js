import mongoose from 'mongoose';
const { Schema } = mongoose;

const circularSchema = new Schema(
  {
    university: { type: String, required: true, trim: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    unit: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    publishedDate: { type: Date, required: true },
    examDate: { type: Date, default: null },
    applyDeadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'upcoming', 'closed'],
      default: 'upcoming',
    },
    link: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('Circular', circularSchema);
