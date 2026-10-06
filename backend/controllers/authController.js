const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
require("dotenv").config();

// Register: patients register directly; providers also need a doctors row
// (specialty/location) created at registration time.
async function register(req, res) {
  try {
    const { name, email, password, phone, role, specialty, qualifications, clinicLocation } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const userRole = ["patient", "provider", "admin"].includes(role) ? role : "patient";
    if (userRole === "provider" && !specialty) {
      return res.status(400).json({ error: "Specialty is required for provider registration." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, phone || null, userRole]
    );
    const userId = result.insertId;

    if (userRole === "provider") {
      await pool.query(
        "INSERT INTO doctors (user_id, specialty, qualifications, clinic_location) VALUES (?, ?, ?, ?)",
        [userId, specialty, qualifications || null, clinicLocation || null]
      );
    }

    res.status(201).json({ message: "Registration successful.", userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid email or password." });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    let doctorId = null;
    if (user.role === "provider") {
      const [doc] = await pool.query("SELECT id FROM doctors WHERE user_id = ?", [user.id]);
      if (doc.length > 0) doctorId = doc[0].id;
    }

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, doctorId },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
}

module.exports = { register, login };
