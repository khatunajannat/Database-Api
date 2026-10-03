import cron from 'node-cron';
import mongoose from 'mongoose';
import { safeInsert, formatDate, TIME_ZONE } from '../utils/notify.js';

// Looked up by name (the models are already registered by the routes)
const ImportantDate = () => mongoose.model('ImportantDate');
const Application = () => mongoose.model('Application');

// ---------- settings ----------
const SCHEDULE = '0 8 * * *'; // every day at 08:00 (in TIME_ZONE)
const REMINDER_DAYS = [3, 1, 0]; // remind 3 days before, 1 day before, and on the day

// Which important dates produce reminders, and how they look.
// "form" (applications open) is left out on purpose: students who applied already know.
const CATEGORY_INFO = {
  deadline: {
    type: 'deadline_reminder',
    category: 'circular',
    tip: 'Check that your application and documents are complete.',
  },
  admit_card: {
    type: 'exam_reminder',
    category: 'status',
    tip: 'Keep your admit card ready.',
  },
  exam: {
    type: 'exam_reminder',
    category: 'status',
    tip: 'Good luck with your preparation!',
  },
  result: {
    type: 'status_update',
    category: 'status',
    tip: 'Check your application for the outcome.',
  },
};

// ---------- date helpers (calendar days in TIME_ZONE) ----------

// "2026-09-20" for the given moment, as seen in TIME_ZONE
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TIME_ZONE });

const keyToUtcMs = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// Whole calendar days from today until `date` (0 = today, 1 = tomorrow, -1 = yesterday)
export const daysUntil = (date, now = new Date()) =>
  Math.round((keyToUtcMs(dayKey(date)) - keyToUtcMs(dayKey(now))) / 86400000);

const prefixFor = (left) => (left === 0 ? 'Today' : left === 1 ? 'Tomorrow' : `In ${left} days`);

// ---------- the job ----------

// Finds important dates that are 3 / 1 / 0 days away and notifies the students who
// applied to that circular. Safe to run many times a day: every reminder has a
// dedupeKey, so nobody gets the same reminder twice.
export async function runReminders(now = new Date()) {
  try {
    const DAY = 24 * 60 * 60 * 1000;
    const from = new Date(now.getTime() - 1.5 * DAY);
    const to = new Date(now.getTime() + (Math.max(...REMINDER_DAYS) + 1) * DAY);

    const dates = await ImportantDate()
      .find({
        circular: { $ne: null },
        category: { $in: Object.keys(CATEGORY_INFO) },
        date: { $gte: from, $lte: to },
      })
      .lean();

    const due = dates
      .map((d) => ({ d, left: daysUntil(d.date, now) }))
      .filter((x) => CATEGORY_INFO[x.d.category] && REMINDER_DAYS.includes(x.left));

    if (!due.length) return { reminders: 0 };

    const circularIds = [...new Set(due.map((x) => String(x.d.circular)))];
    const applications = await Application()
      .find({ circular: { $in: circularIds } })
      .select('user circular')
      .lean();

    const applicantsOf = new Map(); // circularId -> [userId, ...]
    for (const a of applications) {
      const key = String(a.circular);
      if (!applicantsOf.has(key)) applicantsOf.set(key, []);
      applicantsOf.get(key).push(a.user);
    }

    const docs = [];
    for (const { d, left } of due) {
      const info = CATEGORY_INFO[d.category];
      for (const userId of applicantsOf.get(String(d.circular)) || []) {
        docs.push({
          user: userId,
          type: info.type,
          category: info.category,
          title: `${prefixFor(left)}: ${d.title}`,
          message: `Scheduled for ${formatDate(d.date)}. ${info.tip}`,
          link: '/applications',
          linkLabel: 'View application',
          circular: d.circular,
          // date is part of the key, so if an admin moves the date the student
          // is reminded again for the new date
          dedupeKey: `idate:${d._id}:${dayKey(d.date)}:${left}d`,
        });
      }
    }

    await safeInsert(docs);
    console.log(`Reminder job: checked ${due.length} upcoming date(s), ${docs.length} reminder(s) prepared`);
    return { reminders: docs.length };
  } catch (err) {
    console.error('Reminder job failed:', err.message);
    return { reminders: 0, error: err.message };
  }
}

export function startReminderJob() {
  cron.schedule(SCHEDULE, () => runReminders(), { timezone: TIME_ZONE });
  console.log(`Reminder job scheduled (${SCHEDULE}, ${TIME_ZONE})`);

  // Also run once at startup, in case the server was off at 08:00.
  // The dedupeKey makes this harmless if reminders were already sent.
  runReminders();
}
