import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, "Please enter a valid phone number"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
  },
  password: { type: String, required: true },
}, { timestamps: false, versionKey: false });

export default mongoose.model('User', userSchema);