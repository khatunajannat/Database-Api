import mongoose from 'mongoose';
import Notification from '../models/notification.js';
import { mailEnabled, sendMail, buildEmail } from './mailer.js';

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

// Sends one email per new notification. Runs in the background and never throws.
async function deliverEmails(notifications) {
  try {
    if (!notifications?.length || !mailEnabled()) return;

    const ids = [...new Set(notifications.map((n) => String(n.user)))];
    const users = await User().find({ _id: { $in: ids } }).select('name email').lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    // a few at a time, so a big circular announcement does not hammer the mail server
    const BATCH = 5;
    for (let i = 0; i < notifications.length; i += BATCH) {
      await Promise.allSettled(
        notifications.slice(i, i + BATCH).map((n) => {
          const user = byId.get(String(n.user));
          if (!user?.email) return null;
          return sendMail({
            to: user.email,
            ...buildEmail({
              name: user.name,
              title: n.title,
              message: n.message,
              link: n.link,
              linkLabel: n.linkLabel,
            }),
          });
        })
      );
    }
  } catch (err) {
    console.error('Sending emails failed:', err.message);
  }
}

// Saves notifications, then emails the people who got a NEW one.
// Never throws: a notification/email problem must not break the real request
// (submitting an application, saving a circular...).
// Anything already saved (same user + dedupeKey) is skipped, so it is neither
// duplicated in the app nor emailed twice.
export async function safeInsert(docs) {
  if (!docs.length) return;
  try {
    const keyed = docs.filter((d) => d.dedupeKey);
    let seen = new Set();
    if (keyed.length) {
      const found = await Notification.find({
        user: { $in: [...new Set(keyed.map((d) => String(d.user)))] },
        dedupeKey: { $in: [...new Set(keyed.map((d) => d.dedupeKey))] },
      })
        .select('user dedupeKey')
        .lean();
      seen = new Set(found.map((f) => `${f.user}|${f.dedupeKey}`));
    }

    const fresh = docs.filter((d) => !d.dedupeKey || !seen.has(`${d.user}|${d.dedupeKey}`));
    if (!fresh.length) return;

    const inserted = await Notification.insertMany(fresh, { ordered: false });

    // emails go out in the background so the request / job is not slowed down
    deliverEmails(inserted);
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