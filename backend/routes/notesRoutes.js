const express = require("express");
const router = express.Router();
const { uploadNote, getMyNotes, getNotesForAppointment } = require("../controllers/notesController");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/upload", authenticate, authorizeRoles("provider"), upload.single("noteFile"), uploadNote);
router.get("/mine", authenticate, authorizeRoles("patient"), getMyNotes);
router.get("/appointment/:appointmentId", authenticate, getNotesForAppointment);

module.exports = router;
