const pool = require("../config/db");

// FR-1: Search doctors by specialty, name, or location
async function searchDoctors(req, res) {
  try {
    const { specialty, name, location } = req.query;
    let query = `
      SELECT d.id, d.specialty, d.qualifications, d.clinic_location, d.bio, u.name
      FROM doctors d JOIN users u ON u.id = d.user_id
      WHERE 1=1`;
    const params = [];

    if (specialty) {
      query += " AND d.specialty LIKE ?";
      params.push(`%${specialty}%`);
    }
    if (name) {
      query += " AND u.name LIKE ?";
      params.push(`%${name}%`);
    }
    if (location) {
      query += " AND d.clinic_location LIKE ?";
      params.push(`%${location}%`);
    }
    query += " ORDER BY u.name ASC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search doctors." });
  }
}

// FR-3: Doctor profile detail
async function getDoctorProfile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.specialty, d.qualifications, d.clinic_location, d.bio, u.name
       FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Doctor not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch doctor profile." });
  }
}

module.exports = { searchDoctors, getDoctorProfile };
