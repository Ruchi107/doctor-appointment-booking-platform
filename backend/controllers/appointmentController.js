const pool = require("../config/db");

// FR-4/FR-5: Patient books an available slot.
// Uses SELECT ... FOR UPDATE inside a transaction so that two patients
// racing for the same slot cannot both succeed — this is what prevents
// double-booking under concurrent requests.
async function bookAppointment(req, res) {
  const connection = await pool.getConnection();
  try {
    const { slotId, reason } = req.body;
    if (!slotId) return res.status(400).json({ error: "slotId is required." });

    await connection.beginTransaction();

    // Lock the slot row so a concurrent booking attempt has to wait
    const [slotRows] = await connection.query(
      "SELECT * FROM slots WHERE id = ? FOR UPDATE",
      [slotId]
    );
    if (slotRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Slot not found." });
    }
    const slot = slotRows[0];

    if (slot.status !== "open") {
      await connection.rollback();
      return res.status(409).json({ error: "This slot is no longer available." });
    }

    // Prevent a patient from holding more than one active appointment with the same doctor
    const [dup] = await connection.query(
      `SELECT id FROM appointments
       WHERE patient_id = ? AND doctor_id = ? AND status IN ('requested','confirmed')`,
      [req.user.id, slot.doctor_id]
    );
    if (dup.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "You already have an active appointment with this doctor." });
    }

    await connection.query("UPDATE slots SET status = 'requested' WHERE id = ?", [slotId]);

    const [result] = await connection.query(
      "INSERT INTO appointments (patient_id, doctor_id, slot_id, status, reason) VALUES (?, ?, ?, 'requested', ?)",
      [req.user.id, slot.doctor_id, slotId, reason || null]
    );

    await connection.commit();
    res.status(201).json({ message: "Appointment requested. Awaiting provider confirmation.", appointmentId: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to book appointment." });
  } finally {
    connection.release();
  }
}

// FR-6: Patient cancels their own appointment (before a cutoff window)
async function cancelAppointment(req, res) {
  const connection = await pool.getConnection();
  try {
    const CUTOFF_HOURS = 2;

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT a.*, s.slot_date, s.start_time FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       WHERE a.id = ? AND a.patient_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Appointment not found." });
    }
    const appt = rows[0];

    if (!["requested", "confirmed"].includes(appt.status)) {
      await connection.rollback();
      return res.status(400).json({ error: "This appointment cannot be cancelled." });
    }

    const slotDateTime = new Date(`${appt.slot_date.toISOString().split("T")[0]}T${appt.start_time}`);
    const hoursUntil = (slotDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < CUTOFF_HOURS) {
      await connection.rollback();
      return res.status(400).json({ error: `Cancellations must be made at least ${CUTOFF_HOURS} hours before the appointment.` });
    }

    await connection.query("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    await connection.query("UPDATE slots SET status = 'open' WHERE id = ?", [appt.slot_id]);

    await connection.commit();
    res.json({ message: "Appointment cancelled." });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to cancel appointment." });
  } finally {
    connection.release();
  }
}

// FR-11/FR-12: Provider accepts or declines a requested appointment
async function decideAppointment(req, res) {
  const connection = await pool.getConnection();
  try {
    const { decision } = req.body; // 'confirmed' | 'rejected'
    if (!["confirmed", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'confirmed' or 'rejected'." });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT a.* FROM appointments a JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ? AND d.user_id = ? FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Appointment not found." });
    }
    const appt = rows[0];
    if (appt.status !== "requested") {
      await connection.rollback();
      return res.status(400).json({ error: "Only requested appointments can be accepted/declined." });
    }

    await connection.query(
      "UPDATE appointments SET status = ?, decided_at = NOW() WHERE id = ?",
      [decision, req.params.id]
    );
    await connection.query(
      "UPDATE slots SET status = ? WHERE id = ?",
      [decision === "confirmed" ? "booked" : "open", appt.slot_id]
    );

    await connection.commit();
    res.json({ message: `Appointment ${decision}.` });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Failed to update appointment." });
  } finally {
    connection.release();
  }
}

// Patient: view own appointments
async function getMyAppointments(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, s.slot_date, s.start_time, s.end_time, u.name AS doctor_name, d.specialty
       FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       WHERE a.patient_id = ? ORDER BY s.slot_date DESC, s.start_time DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appointments." });
  }
}

// Provider: view appointments for their own doctor profile
async function getProviderAppointments(req, res) {
  try {
    const { status } = req.query;
    let query = `
      SELECT a.*, s.slot_date, s.start_time, s.end_time, u.name AS patient_name
      FROM appointments a
      JOIN slots s ON s.id = a.slot_id
      JOIN doctors d ON d.id = a.doctor_id
      JOIN users u ON u.id = a.patient_id
      WHERE d.user_id = ?`;
    const params = [req.user.id];
    if (status) {
      query += " AND a.status = ?";
      params.push(status);
    }
    query += " ORDER BY s.slot_date, s.start_time";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch appointments." });
  }
}

module.exports = {
  bookAppointment,
  cancelAppointment,
  decideAppointment,
  getMyAppointments,
  getProviderAppointments,
};
