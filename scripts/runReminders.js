// Runs the reminder job once, right now. Handy for testing.
//
// Run from the Database-Api folder:
//   node scripts/runReminders.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import '../models/user.js';
import '../models/application.js';
import '../models/importantDate.js';
import { runReminders } from '../jobs/reminderJob.js';

dotenv.config();

try {
  await mongoose.connect(process.env.DB_URL);
  const result = await runReminders();
  console.log('Done:', result);
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
