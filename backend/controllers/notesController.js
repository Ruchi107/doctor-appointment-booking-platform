const pool = require("../config/db");

// FR-14: Provider uploads medical notes/prescription for a completed/confirmed appointment
async function uploadNote(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "A file is required." });

    const { appointmentId, notesText } = req.body;

    const [appt] = await pool.query(
      `SELECT a.* FROM appointments a JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ? AND d.user_id = ?`,
      [appointmentId, req.user.id]
    );
    if (appt.length === 0) return res.status(404).json({ error: "Appointment not found." });
    if (!["confirmed", "completed"].includes(appt[0].status)) {
      return res.status(400).json({ error: "Notes can only be added to confirmed or completed appointments." });
    }

    const filePath = `/uploads/${req.file.filename}`;
    await pool.query(
      "INSERT INTO medical_notes (appointment_id, file_path, notes_text, uploaded_by) VALUES (?, ?, ?, ?)",
      [appointmentId, filePath, notesText || null, req.user.id]
    );

    // Mark the appointment completed once notes are added
    await pool.query("UPDATE appointments SET status = 'completed' WHERE id = ?", [appointmentId]);

    res.status(201).json({ message: "Medical note uploaded.", filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload note." });
  }
}

// FR-15/FR-16: Patient views their own prescriptions/notes only
async function getMyNotes(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, u.name AS doctor_name, d.specialty, s.slot_date
       FROM medical_notes n
       JOIN appointments a ON a.id = n.appointment_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       JOIN slots s ON s.id = a.slot_id
       WHERE a.patient_id = ?
       ORDER BY n.uploaded_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes." });
  }
}

// Provider: view notes they've uploaded for a given appointment
async function getNotesForAppointment(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT n.* FROM medical_notes n
       JOIN appointments a ON a.id = n.appointment_id
       JOIN doctors d ON d.id = a.doctor_id
       WHERE n.appointment_id = ? AND (d.user_id = ? OR a.patient_id = ?)`,
      [req.params.appointmentId, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes." });
  }
}

module.exports = { uploadNote, getMyNotes, getNotesForAppointment };
