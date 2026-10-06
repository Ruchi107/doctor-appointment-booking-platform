const express = require("express");
const router = express.Router();
const {
  bookAppointment,
  cancelAppointment,
  decideAppointment,
  getMyAppointments,
  getProviderAppointments,
} = require("../controllers/appointmentController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

// Patient
router.post("/", authenticate, authorizeRoles("patient"), bookAppointment);
router.patch("/:id/cancel", authenticate, authorizeRoles("patient"), cancelAppointment);
router.get("/mine", authenticate, authorizeRoles("patient"), getMyAppointments);

// Provider
router.patch("/:id/decide", authenticate, authorizeRoles("provider"), decideAppointment);
router.get("/provider", authenticate, authorizeRoles("provider"), getProviderAppointments);

module.exports = router;
