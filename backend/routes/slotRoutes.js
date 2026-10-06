const express = require("express");
const router = express.Router();
const {
  getOpenSlots,
  createSlot,
  blockSlot,
  unblockSlot,
  getMySlots,
} = require("../controllers/slotController");
const { authenticate, authorizeRoles } = require("../middleware/auth");

// Public: view a doctor's open slots
router.get("/doctor/:doctorId", getOpenSlots);

// Provider only
router.get("/mine", authenticate, authorizeRoles("provider"), getMySlots);
router.post("/", authenticate, authorizeRoles("provider"), createSlot);
router.patch("/:id/block", authenticate, authorizeRoles("provider"), blockSlot);
router.patch("/:id/unblock", authenticate, authorizeRoles("provider"), unblockSlot);

module.exports = router;
