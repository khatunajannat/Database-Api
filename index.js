import express from "express";
import mongoose from "mongoose";

const port =4000;
const app = express();
mongoose.connect("mongodb+srv://khatunajannat35_db_user:Admito03Pass@cluster0.0zxk5rq.mongodb.net/").then((  )=>console.log("Connected to MongoDB") ).catch((err) => console.error("Error connecting to MongoDB:", err));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
} );