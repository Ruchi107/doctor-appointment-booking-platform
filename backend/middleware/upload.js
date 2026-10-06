const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "note-" + uniqueSuffix + path.extname(file.originalname));
  },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|pdf/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype) || file.mimetype === "application/pdf";
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error("Only image or PDF files are allowed for medical notes."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
