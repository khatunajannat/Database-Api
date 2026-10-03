import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Circular from '../models/circular.js';
import { syncCircularDates } from '../utils/syncCircularDates.js';
 
dotenv.config();
 
await mongoose.connect(process.env.DB_URL);
 
const circulars = await Circular.find();
for (const circular of circulars) {
  await syncCircularDates(circular);
}
 
console.log(`Synced important dates for ${circulars.length} circulars`);
await mongoose.disconnect();
 