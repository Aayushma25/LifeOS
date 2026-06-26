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

// GET /api/study-sessions - includes a small stats summary for the revision planner
router.get("/", async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const sessions = await prisma.studySession.findMany({
      where: { userId: req.user.id, ...(subjectId ? { subjectId } : {}) },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    res.json({ sessions, totalMinutes, totalSessions: sessions.length });
  } catch (err) {
    next(err);
  }
});

const validators = [body("durationMinutes").isInt({ min: 1 }).withMessage("Duration must be a positive number of minutes.")];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { subjectId, date, durationMinutes, notes } = req.body;
    const session = await prisma.studySession.create({
      data: {
        userId: req.user.id,
        subjectId: subjectId || null,
        date: date ? new Date(date) : new Date(),
        durationMinutes: Number(durationMinutes),
        notes: notes || null,
      },
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.studySession.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Study session not found." });
    await prisma.studySession.delete({ where: { id: req.params.id } });
    res.json({ message: "Study session deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
