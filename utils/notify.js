import mongoose from 'mongoose';
import Notification from '../models/notification.js';

// These two are looked up by name instead of imported, so we always use the
// model your app already registered, whatever folder casing other files import from.
const User = () => mongoose.model('User');
const Application = () => mongoose.model('Application');

// Dates in notification text are shown in this time zone
export const TIME_ZONE = 'Asia/Dhaka';

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });

// Insert many notifications. Never throws: a notification problem must not break
// the real request (submitting an application, saving a circular...).
// Duplicates (same user + dedupeKey) are skipped silently.
export async function safeInsert(docs) {
  if (!docs.length) return;
  try {
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    if (!String(err?.message).includes('E11000')) {
      console.error('Creating notifications failed:', err.message);
    }
  }
}

// A new account was created -> welcome message
export async function notifyWelcome(user) {
  try {
    await safeInsert([
      {
        user: user._id,
        type: 'welcome',
        category: 'general',
        title: 'Welcome to Admito',
        message: 'Your account has been created successfully. Complete your profile to get started.',
        link: '/information',
        linkLabel: 'Complete profile',
        dedupeKey: `user:${user._id}:welcome`,
      },
    ]);
  } catch (err) {
    console.error('notifyWelcome failed:', err.message);
  }
}

// A user submitted an application -> notify that user
export async function notifyApplicationSubmitted(application) {
  try {
    await safeInsert([
      {
        user: application.user,
        type: 'application_submitted',
        category: 'status',
        title: 'Application submitted',
        message: `Your application ${application.applicationNo} for ${application.university} (${application.unit}) has been received. You'll be notified of updates here.`,
        link: '/applications',
        linkLabel: 'View application',
        circular: application.circular,
        application: application._id,
        dedupeKey: `application:${application._id}:submitted`,
      },
    ]);
  } catch (err) {
    console.error('notifyApplicationSubmitted failed:', err.message);
  }
}

// Admin published a circular -> notify every student
export async function notifyCircularPublished(circular) {
  try {
    if (circular.status === 'closed') return;

    const users = await User().find({ role: 'user' }).select('_id').lean();

    await safeInsert(
      users.map((u) => ({
        user: u._id,
        type: 'circular_published',
        category: 'circular',
        title: 'New circular published',
        message: `${circular.university} (${circular.unit}): ${circular.title}. Apply before ${formatDate(circular.applyDeadline)}.`,
        link: '/circulars',
        linkLabel: 'View circular',
        circular: circular._id,
        dedupeKey: `circular:${circular._id}:published`,
      }))
    );
  } catch (err) {
    console.error('notifyCircularPublished failed:', err.message);
  }
}

const dateChanged = (a, b) =>
  (a ? new Date(a).getTime() : null) !== (b ? new Date(b).getTime() : null);

// Admin edited a circular -> if the deadline or exam date changed,
// notify only the students who applied to it.
// `before` is the circular as it was before the edit, `after` is the saved one.
export async function notifyCircularUpdated(before, after) {
  try {
    const lines = [];

    if (dateChanged(before.applyDeadline, after.applyDeadline)) {
      lines.push(
        `Application deadline changed from ${formatDate(before.applyDeadline)} to ${formatDate(after.applyDeadline)}.`
      );
    }

    if (dateChanged(before.examDate, after.examDate)) {
      if (!before.examDate) lines.push(`Exam date set to ${formatDate(after.examDate)}.`);
      else if (!after.examDate) lines.push('Exam date has been removed.');
      else
        lines.push(
          `Exam date changed from ${formatDate(before.examDate)} to ${formatDate(after.examDate)}.`
        );
    }

    if (!lines.length) return; // nothing students care about changed

    const applicants = await Application().find({ circular: after._id }).select('user').lean();

    await safeInsert(
      applicants.map((a) => ({
        user: a.user,
        type: 'circular_updated',
        category: 'circular',
        title: `Update: ${after.university} (${after.unit})`,
        message: lines.join(' '),
        link: '/applications',
        linkLabel: 'View application',
        circular: after._id,
        // no dedupeKey: the same circular can legitimately change more than once
      }))
    );
  } catch (err) {
    console.error('notifyCircularUpdated failed:', err.message);
  }
}