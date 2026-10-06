const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticate(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided. Please log in." });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." });
    req.user = decoded; // { id, role, name }
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

module.exports = { authenticate, authorizeRoles };
