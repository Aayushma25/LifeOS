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

// Standard 4.0 letter-grade scale used by the GPA calculator
const GRADE_POINTS = {
  "A+": 4.0, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, "D-": 0.7,
  F: 0.0,
};

// GET /api/subjects
router.get("/", async (req, res, next) => {
  try {
    const { semester } = req.query;
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user.id, ...(semester ? { semester } : {}) },
      include: {
        _count: { select: { assignments: true, exams: true, attendance: true, flashcards: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(subjects);
  } catch (err) {
    next(err);
  }
});

// GET /api/subjects/gpa - simple credit-weighted GPA calculator
router.get("/gpa", async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user.id, grade: { not: null } },
    });

    let totalPoints = 0;
    let totalCredits = 0;
    const breakdown = [];

    for (const s of subjects) {
      const points = GRADE_POINTS[s.grade];
      if (points === undefined) continue;
      totalPoints += points * s.credits;
      totalCredits += s.credits;
      breakdown.push({ subject: s.name, grade: s.grade, credits: s.credits, points });
    }

    res.json({
      gpa: totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : null,
      totalCredits,
      breakdown,
      scale: GRADE_POINTS,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const subject = await prisma.subject.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        assignments: { orderBy: { deadline: "asc" } },
        exams: { orderBy: { date: "asc" } },
        studySessions: { orderBy: { date: "desc" }, take: 20 },
        attendance: { orderBy: { date: "desc" } },
      },
    });
    if (!subject) return res.status(404).json({ error: "Subject not found." });
    res.json(subject);
  } catch (err) {
    next(err);
  }
});

const subjectValidators = [body("name").trim().notEmpty().withMessage("Subject name is required.")];

router.post("/", subjectValidators, handleValidation, async (req, res, next) => {
  try {
    const { name, code, instructor, credits, semester, color, grade } = req.body;
    const subject = await prisma.subject.create({
      data: {
        userId: req.user.id,
        name,
        code: code || null,
        instructor: instructor || null,
        credits: credits !== undefined && credits !== "" ? Number(credits) : 3,
        semester: semester || null,
        color: color || "#5B8FCB",
        grade: grade || null,
      },
    });
    res.status(201).json(subject);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", subjectValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.subject.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Subject not found." });

    const { name, code, instructor, credits, semester, color, grade } = req.body;
    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data: {
        name,
        code: code ?? existing.code,
        instructor: instructor ?? existing.instructor,
        credits: credits !== undefined && credits !== "" ? Number(credits) : existing.credits,
        semester: semester ?? existing.semester,
        color: color ?? existing.color,
        grade: grade === "" ? null : grade ?? existing.grade,
      },
    });
    res.json(subject);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.subject.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Subject not found." });
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ message: "Subject deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
