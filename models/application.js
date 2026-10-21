import mongoose from 'mongoose';
const { Schema } = mongoose;

const academicSchema = new Schema(
  {
    board: { type: String, trim: true },
    year: { type: Number },
    gpa: { type: Number, min: 0, max: 5 },
  },
  { _id: false }
);

// Snapshot of what the student filled in. Stored on the application so later
// profile edits never change an already-submitted form.
const formDataSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    address: { type: String, trim: true },
    ssc: academicSchema,
    hsc: academicSchema,
    photoUrl: { type: String, trim: true }, 
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    circular: { type: Schema.Types.ObjectId, ref: 'Circular', required: true },

 

    university: { type: String, required: true },
    unit: { type: String, required: true },
    title: { type: String, required: true },

    applicationNo: { type: String, required: true, unique: true },
    formData: { type: formDataSchema, required: true },
  },
  { timestamps: true, versionKey: false }
);


applicationSchema.index({ user: 1, circular: 1 }, { unique: true });

export default mongoose.models.Application || mongoose.model('Application', applicationSchema);