require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const slotRoutes = require("./routes/slotRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const notesRoutes = require("./routes/notesRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notes", notesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Doctor Appointment Booking Platform API is running." });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Doctor Appointment API running on http://localhost:${PORT}`);
});
