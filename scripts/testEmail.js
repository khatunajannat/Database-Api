// Checks your email settings and sends one sample email.
//
// Run from the Database-Api folder:
//   node scripts/testEmail.js your-email@example.com

import dotenv from 'dotenv';
import { verifyMailer, sendMail, buildEmail } from '../utils/mailer.js';

dotenv.config();

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/testEmail.js your-email@example.com');
  process.exit(1);
}

try {
  console.log('Checking SMTP settings...');
  await verifyMailer();
  console.log('SMTP login OK. Sending a sample email...');

  const ok = await sendMail({
    to,
    ...buildEmail({
      name: 'there',
      title: 'Test email from Admito',
      message: 'If you can read this, your email settings work and Admito can send notifications by email.',
      link: '/notifications',
      linkLabel: 'Open notifications',
    }),
  });

  console.log(ok ? `Sent! Check the inbox (and spam folder) of ${to}` : 'Sending failed, see the error above.');
} catch (err) {
  console.error('Email settings problem:', err.message);
  process.exitCode = 1;
}
