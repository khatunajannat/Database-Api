import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import circularRoutes from "./routes/circularRoutes.js";
import importantDateRoutes from "./routes/importantDateRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import assessmentRoutes from "./routes/assessmentRoutes.js";
import applicationRoutes from './routes/applicationRoutes.js';
import profileRoutes from "./routes/profileRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import { startReminderJob } from "./jobs/reminderJob.js";
import { carbonFootprint, getCarbonStats } from "./middleware/carbonFootprint.js";
import { verifyToken, requireAdmin } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();

// Render (and most hosts) sit behind a proxy: needed so req.ip is the real visitor IP
app.set("trust proxy", 1);

// CORS: set FRONTEND_URL to your site (comma-separate several). If it is empty, anyone may call the API.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const isLocalDev = (origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, cb) =>
            cb(null, !origin || allowedOrigins.includes(origin) || isLocalDev(origin)),
        }
      : undefined
  )
);
app.use(express.json());
app.use(carbonFootprint); // must come BEFORE the routes, or it never sees their requests

// Slow down bots: login / signup / contact
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Try again in a few minutes." });
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Too many sign-ups from this network. Try again later." });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many messages. Please try again later." });
app.use(["/users/login", "/api/users/login"], loginLimiter);
app.use(["/users/signup", "/api/users/signup"], signupLimiter);
app.use("/api/contact", contactLimiter);

app.use("/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use('/api/circulars', circularRoutes);
app.use('/api/important-dates', importantDateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/banners", bannerRoutes);
app.get("/api/carbon", verifyToken, requireAdmin, getCarbonStats);

mongoose.connect(process.env.DB_URL)
  .then(() => {
    console.log("Connected to MongoDB");
    startReminderJob(); // daily deadline / exam reminders
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // fail loudly so the host shows the real problem in its logs
  });

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});