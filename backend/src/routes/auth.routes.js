const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { signToken } = require("../utils/jwt");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required."),
    body("username")
      .trim()
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters.")
      .matches(/^[a-zA-Z0-9_.-]+$/)
      .withMessage("Username can only contain letters, numbers, _ . -"),
    body("email").trim().isEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }
      return true;
    }),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { fullName, username, email, password } = req.body;

      const existing = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
      if (existing) {
        return res.status(409).json({ error: "Username or email already in use." });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // First registered user becomes admin automatically (self-hosted, single-tenant friendly)
      const userCount = await prisma.user.count();
      const role = userCount === 0 ? "ADMIN" : "USER";

      const user = await prisma.user.create({
        data: { fullName, username, email, passwordHash, role },
      });

      const token = signToken({ sub: user.id });

      res.status(201).json({
        token,
        user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  [
    body("identifier").trim().notEmpty().withMessage("Username or email is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body;

      const user = await prisma.user.findFirst({
        where: { OR: [{ username: identifier }, { email: identifier }] },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials." });
      }
      if (user.isSuspended) {
        return res.status(403).json({ error: "This account has been suspended." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const token = signToken({ sub: user.id });

      res.json({
        token,
        user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/me - update profile
router.patch(
  "/me",
  requireAuth,
  [
    body("fullName").optional().trim().notEmpty(),
    body("email").optional().trim().isEmail(),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { fullName, email } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { ...(fullName && { fullName }), ...(email && { email }) },
      });
      res.json({ id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/auth/me/password
router.patch(
  "/me/password",
  requireAuth,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters."),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect." });

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      res.json({ message: "Password updated successfully." });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/auth/me
router.delete("/me", requireAuth, async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ message: "Account deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
