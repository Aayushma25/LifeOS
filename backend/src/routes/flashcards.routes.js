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

// GET /api/flashcards?subjectId=
router.get("/", async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const cards = await prisma.flashcard.findMany({
      where: { userId: req.user.id, ...(subjectId ? { subjectId } : {}) },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

const validators = [
  body("front").trim().notEmpty().withMessage("The question/front side is required."),
  body("back").trim().notEmpty().withMessage("The answer/back side is required."),
];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { front, back, subjectId } = req.body;
    const card = await prisma.flashcard.create({
      data: { userId: req.user.id, front, back, subjectId: subjectId || null },
    });
    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.flashcard.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Flashcard not found." });

    const { front, back, subjectId } = req.body;
    const card = await prisma.flashcard.update({
      where: { id: req.params.id },
      data: { front, back, subjectId: subjectId === "" ? null : subjectId ?? existing.subjectId },
    });
    res.json(card);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/flashcards/:id/review - used by quiz mode to record a correct/incorrect answer
router.patch("/:id/review", async (req, res, next) => {
  try {
    const { correct } = req.body;
    const existing = await prisma.flashcard.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Flashcard not found." });

    const card = await prisma.flashcard.update({
      where: { id: req.params.id },
      data: {
        correctCount: correct ? existing.correctCount + 1 : existing.correctCount,
        incorrectCount: !correct ? existing.incorrectCount + 1 : existing.incorrectCount,
        lastReviewedAt: new Date(),
      },
    });
    res.json(card);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.flashcard.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Flashcard not found." });
    await prisma.flashcard.delete({ where: { id: req.params.id } });
    res.json({ message: "Flashcard deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
