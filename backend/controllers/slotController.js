const pool = require("../config/db");

// FR-2: Public — view a doctor's open slots (next 7 days by default)
async function getOpenSlots(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;
    const [rows] = await pool.query(
      `SELECT id, slot_date, start_time, end_time FROM slots
       WHERE doctor_id = ? AND status = 'open'
         AND slot_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY slot_date, start_time`,
      [req.params.doctorId, days]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch slots." });
  }
}

// FR-8: Provider creates a new slot (one-time or looped by frontend for recurring)
async function createSlot(req, res) {
  try {
    const [doc] = await pool.query("SELECT id FROM doctors WHERE user_id = ?", [req.user.id]);
    if (doc.length === 0) return res.status(403).json({ error: "No doctor profile found for this account." });

    const { slotDate, startTime, endTime } = req.body;
    if (!slotDate || !startTime || !endTime) {
      return res.status(400).json({ error: "slotDate, startTime, and endTime are required." });
    }

    const [result] = await pool.query(
      "INSERT INTO slots (doctor_id, slot_date, start_time, end_time, status) VALUES (?, ?, ?, ?, 'open')",
      [doc[0].id, slotDate, startTime, endTime]
    );
    res.status(201).json({ message: "Slot created.", slotId: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This slot already exists." });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create slot." });
  }
}

// FR-9: Provider blocks/unblocks a slot (e.g. leave). Cannot block a booked slot.
async function blockSlot(req, res) {
  try {
    const [slotRows] = await pool.query(
      `SELECT s.* FROM slots s JOIN doctors d ON d.id = s.doctor_id
       WHERE s.id = ? AND d.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (slotRows.length === 0) return res.status(404).json({ error: "Slot not found." });
    if (["requested", "booked"].includes(slotRows[0].status)) {
      return res.status(400).json({ error: "Cannot block a slot that has an active booking. Cancel the appointment first." });
    }

    await pool.query("UPDATE slots SET status = 'blocked' WHERE id = ?", [req.params.id]);
    res.json({ message: "Slot blocked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to block slot." });
  }
}

async function unblockSlot(req, res) {
  try {
    await pool.query(
      `UPDATE slots s JOIN doctors d ON d.id = s.doctor_id
       SET s.status = 'open' WHERE s.id = ? AND d.user_id = ? AND s.status = 'blocked'`,
      [req.params.id, req.user.id]
    );
    res.json({ message: "Slot unblocked." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unblock slot." });
  }
}

// Provider: view all of their own slots (for the calendar/management view)
async function getMySlots(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.* FROM slots s JOIN doctors d ON d.id = s.doctor_id
       WHERE d.user_id = ? ORDER BY s.slot_date, s.start_time`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your slots." });
  }
}

module.exports = { getOpenSlots, createSlot, blockSlot, unblockSlot, getMySlots };
