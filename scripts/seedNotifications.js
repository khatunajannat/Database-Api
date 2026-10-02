// Creates sample notifications for one user, so you can test the page
// before the real triggers exist (step 3).
//
// Run from the Database-Api folder:
//   node scripts/seedNotifications.js your-email@example.com
//
// Running it again replaces the earlier sample ones (they are marked "seed:").

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../Models/user.js';
import Notification from '../Models/notification.js';

dotenv.config();

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/seedNotifications.js your-email@example.com');
  process.exit(1);
}

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const daysAgo = (d) => minutesAgo(d * 24 * 60);

try {
  await mongoose.connect(process.env.DB_URL);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  await Notification.deleteMany({ user: user._id, dedupeKey: /^seed:/ });

  const samples = [
    {
      type: 'status_update', category: 'status', read: false, createdAt: minutesAgo(2),
      title: 'Merit list for Phase 1 published',
      message: "Check your application status to see if you've been shortlisted for the next round.",
      link: '/information', linkLabel: 'Check status',
    },
    {
      type: 'deadline_reminder', category: 'circular', read: false, createdAt: minutesAgo(60),
      title: 'Application deadline in 3 days',
      message: 'Apply before the deadline so you do not miss your seat.',
      link: '/circulars', linkLabel: 'View circulars',
    },
    {
      type: 'circular_published', category: 'circular', read: false, createdAt: minutesAgo(300),
      title: 'New circular published',
      message: 'A new admission circular is now open for applications.',
      link: '/circulars', linkLabel: 'View circular',
    },
    {
      type: 'exam_reminder', category: 'status', read: true, createdAt: daysAgo(1),
      title: 'Assessment schedule released',
      message: 'Your entrance assessment is scheduled for Sep 20, 10:00 AM.',
    },
    {
      type: 'welcome', category: 'general', read: true, createdAt: daysAgo(2),
      title: 'Welcome to Admito',
      message: 'Your account has been created successfully. Complete your profile to get started.',
      link: '/information', linkLabel: 'Complete profile',
    },
    {
      type: 'application_submitted', category: 'status', read: true, createdAt: daysAgo(3),
      title: 'Application received',
      message: "We've received your application. You'll be notified of updates here.",
    },
  ].map((n, i) => ({
    ...n,
    user: user._id,
    readAt: n.read ? n.createdAt : null,
    dedupeKey: `seed:${i + 1}`,
  }));

  await Notification.insertMany(samples);
  console.log(`Created ${samples.length} sample notifications for ${user.email}`);
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
