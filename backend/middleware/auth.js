const jwt = require("jsonwebtoken");

/**
 * Verifies the Bearer JWT on protected team routes.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — please log in." });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.team = decoded; // { teamId, teamName }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}

/**
 * Checks the X-Admin-Key header for admin routes.
 */
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
