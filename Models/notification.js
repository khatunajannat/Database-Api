import mongoose from 'mongoose';
const { Schema } = mongoose;

export const NOTIFICATION_TYPES = [
  'welcome',
  'application_submitted',
  'status_update',
  'circular_published',
  'deadline_reminder',
  'exam_reminder',
  'general',
];

// "category" drives the filter tabs on the page (Circulars / Status)
export const NOTIFICATION_CATEGORIES = ['circular', 'status', 'general'];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, default: 'general' },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Optional call-to-action button (matches cta { label, href } on the page)
    link: { type: String, trim: true, default: null },
    linkLabel: { type: String, trim: true, default: null },

    // Optional references, handy for cleanup when an application/circular is deleted
    circular: { type: Schema.Types.ObjectId, ref: 'Circular', default: null },
    application: { type: Schema.Types.ObjectId, ref: 'Application', default: null },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Used later by the deadline-reminder job so the same reminder is never sent twice,
    // e.g. "deadline:<circularId>:3d"
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Fast "my newest notifications" queries
notificationSchema.index({ user: 1, createdAt: -1 });

// One notification per user per dedupeKey (ignored when dedupeKey is null)
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

export default mongoose.model('Notification', notificationSchema);
