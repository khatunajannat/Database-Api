import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import circularRoutes from './routes/circularRoutes.js';
import importantDateRoutes from './routes/importantDateRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import profileRoutes from "./routes/profileRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);
app.use('/api/circulars', circularRoutes);
app.use('/api/important-dates', importantDateRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use("/api/profile", profileRoutes);

mongoose.connect(process.env.DB_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});