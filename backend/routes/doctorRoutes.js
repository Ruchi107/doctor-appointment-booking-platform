const express = require("express");
const router = express.Router();
const { searchDoctors, getDoctorProfile } = require("../controllers/doctorController");

router.get("/", searchDoctors);
router.get("/:id", getDoctorProfile);

module.exports = router;
