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

// GET /api/goals
router.get("/", async (req, res, next) => {
  try {
    const { term, status } = req.query;
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id, ...(term ? { term } : {}), ...(status ? { status } : {}) },
      include: { milestones: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
    });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

const validators = [body("title").trim().notEmpty().withMessage("Title is required.")];

router.post("/", validators, handleValidation, async (req, res, next) => {
  try {
    const { title, description, term, targetDate } = req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        term: term || "SHORT_TERM",
        targetDate: targetDate ? new Date(targetDate) : null,
      },
      include: { milestones: true },
    });
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Goal not found." });

    const { title, description, term, targetDate, status, progressPercent } = req.body;
    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        title,
        description: description ?? existing.description,
        term: term ?? existing.term,
        status: status ?? existing.status,
        targetDate: targetDate ? new Date(targetDate) : existing.targetDate,
        progressPercent:
          progressPercent !== undefined ? Math.max(0, Math.min(100, Number(progressPercent))) : existing.progressPercent,
      },
      include: { milestones: true },
    });
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Goal not found." });
    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: "Goal deleted." });
  } catch (err) {
    next(err);
  }
});

// ---- Milestones (sub-resource) ----

router.post(
  "/:goalId/milestones",
  [body("title").trim().notEmpty().withMessage("Milestone title is required.")],
  handleValidation,
  async (req, res, next) => {
    try {
      const goal = await prisma.goal.findFirst({ where: { id: req.params.goalId, userId: req.user.id } });
      if (!goal) return res.status(404).json({ error: "Goal not found." });

      const { title, dueDate } = req.body;
      const milestone = await prisma.milestone.create({
        data: { goalId: goal.id, title, dueDate: dueDate ? new Date(dueDate) : null },
      });
      res.status(201).json(milestone);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/goals/:goalId/milestones/:id - toggle complete; auto-recomputes goal progress
router.patch("/:goalId/milestones/:id", async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, userId: req.user.id },
      include: { milestones: true },
    });
    if (!goal) return res.status(404).json({ error: "Goal not found." });

    const milestone = goal.milestones.find((m) => m.id === req.params.id);
    if (!milestone) return res.status(404).json({ error: "Milestone not found." });

    const updated = await prisma.milestone.update({
      where: { id: milestone.id },
      data: { isCompleted: !milestone.isCompleted },
    });

    // Recompute the parent goal's progress from its milestones, if any exist
    const allMilestones = await prisma.milestone.findMany({ where: { goalId: goal.id } });
    if (allMilestones.length > 0) {
      const completed = allMilestones.filter((m) => m.isCompleted).length;
      const progressPercent = Math.round((completed / allMilestones.length) * 100);
      await prisma.goal.update({ where: { id: goal.id }, data: { progressPercent } });
    }

    const refreshed = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: { milestones: { orderBy: { createdAt: "asc" } } },
    });
    res.json(refreshed);
  } catch (err) {
    next(err);
  }
});

router.delete("/:goalId/milestones/:id", async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.goalId, userId: req.user.id } });
    if (!goal) return res.status(404).json({ error: "Goal not found." });
    await prisma.milestone.delete({ where: { id: req.params.id } });
    res.json({ message: "Milestone deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
