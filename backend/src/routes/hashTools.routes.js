const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

const ALGORITHMS = ["md5", "sha1", "sha256", "sha512"];
const MAX_BASE64_LENGTH = 30 * 1024 * 1024; // ~22MB of raw file data, generous for a local tool

function hashBuffer(buffer) {
  return ALGORITHMS.reduce((acc, algo) => {
    acc[algo] = crypto.createHash(algo).update(buffer).digest("hex");
    return acc;
  }, {});
}

// POST /api/hash-tools/generate
// mode "text": hashes the raw text as UTF-8
// mode "file": `input` is base64-encoded file content (read client-side, no upload storage needed)
router.post(
  "/generate",
  [
    body("mode").isIn(["text", "file"]).withMessage("mode must be 'text' or 'file'."),
    body("input").isString().notEmpty().withMessage("Input is required."),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { mode, input, fileName } = req.body;

      if (mode === "file" && input.length > MAX_BASE64_LENGTH) {
        return res.status(413).json({ error: "File is too large for in-browser hashing. Try a smaller file." });
      }

      const buffer = mode === "file" ? Buffer.from(input, "base64") : Buffer.from(input, "utf8");
      const hashes = hashBuffer(buffer);

      res.json({ hashes, byteLength: buffer.length, fileName: fileName || null });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/hash-tools/compare - simple case-insensitive integrity comparison
router.post(
  "/compare",
  [body("hashA").isString().notEmpty(), body("hashB").isString().notEmpty()],
  handleValidation,
  (req, res) => {
    const a = req.body.hashA.trim().toLowerCase();
    const b = req.body.hashB.trim().toLowerCase();
    res.json({ match: a === b && a.length > 0 });
  }
);

module.exports = router;
