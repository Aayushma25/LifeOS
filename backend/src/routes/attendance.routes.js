const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

// GET /api/attendance?subjectId= - records plus a percentage summary
router.get("/", async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: "subjectId is required." });

    const records = await prisma.attendance.findMany({
      where: { userId: req.user.id, subjectId },
      orderBy: { date: "desc" },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : null;

    res.json({ records, total, present, percentage });
  } catch (err) {
    next(err);
  }
});

const validators = [
  body("subjectId").notEmpty().withMessage("subjectId is required."),
  body("status").isIn(["PRESENT", "ABSENT", "EXCUSED"]).withMessage("Invalid attendance status."),
];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { subjectId, date, status } = req.body;
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId: req.user.id } });
    if (!subject) return res.status(404).json({ error: "Subject not found." });

    const record = await prisma.attendance.create({
      data: { userId: req.user.id, subjectId, date: date ? new Date(date) : new Date(), status },
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.attendance.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Attendance record not found." });
    await prisma.attendance.delete({ where: { id: req.params.id } });
    res.json({ message: "Attendance record deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
