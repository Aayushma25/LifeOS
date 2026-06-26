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

router.get("/", async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const exams = await prisma.exam.findMany({
      where: { userId: req.user.id, ...(subjectId ? { subjectId } : {}) },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "asc" },
    });
    res.json(exams);
  } catch (err) {
    next(err);
  }
});

const validators = [
  body("title").trim().notEmpty().withMessage("Title is required."),
  body("date").notEmpty().withMessage("Date is required."),
];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { title, subjectId, type, date, notes } = req.body;
    const exam = await prisma.exam.create({
      data: {
        userId: req.user.id,
        title,
        subjectId: subjectId || null,
        type: type || "QUIZ",
        date: new Date(date),
        notes: notes || null,
      },
    });
    res.status(201).json(exam);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.exam.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Exam not found." });

    const { title, subjectId, type, date, notes } = req.body;
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        title,
        subjectId: subjectId === "" ? null : subjectId ?? existing.subjectId,
        type: type ?? existing.type,
        date: date ? new Date(date) : existing.date,
        notes: notes ?? existing.notes,
      },
    });
    res.json(exam);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.exam.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Exam not found." });
    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ message: "Exam deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
