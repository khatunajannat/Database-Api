import mongoose from 'mongoose';
const { Schema } = mongoose;

const importantDateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    university: { type: String, required: true, trim: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    category: {
      type: String,
      enum: ['form', 'deadline', 'exam', 'result'],
      required: true,
    },
    date: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model('ImportantDate', importantDateSchema);
