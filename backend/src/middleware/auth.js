const { verifyToken } = require("../utils/jwt");
const prisma = require("../lib/prisma");

// Verifies the Bearer JWT and attaches req.user
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(401).json({ error: "Invalid session. Please log in again." });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "This account has been suspended." });
    }

    req.user = { id: user.id, role: user.role, email: user.email, username: user.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
