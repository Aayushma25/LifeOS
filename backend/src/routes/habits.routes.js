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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Computes the current consecutive-day streak ending today (or yesterday, so a
// habit doesn't lose its streak just because today hasn't been logged yet).
function computeStreak(completedDates) {
  const daySet = new Set(completedDates.map((d) => startOfDay(d).getTime()));
  let streak = 0;
  let cursor = startOfDay(new Date());

  if (!daySet.has(cursor.getTime())) {
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  while (daySet.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

// GET /api/habits - includes streak + last-30-day completion history per habit
router.get("/", async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "asc" },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logs = await prisma.habitLog.findMany({
      where: { userId: req.user.id, date: { gte: startOfDay(thirtyDaysAgo) } },
    });

    const logsByHabit = new Map();
    for (const log of logs) {
      if (!logsByHabit.has(log.habitId)) logsByHabit.set(log.habitId, []);
      logsByHabit.get(log.habitId).push(log);
    }

    const result = habits.map((habit) => {
      const habitLogs = logsByHabit.get(habit.id) || [];
      const completedDates = habitLogs.filter((l) => l.completed).map((l) => l.date);
      const totalDays = habitLogs.length;
      const completedDays = completedDates.length;

      return {
        ...habit,
        streak: computeStreak(completedDates),
        completionRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
        history: habitLogs.map((l) => ({ date: l.date, completed: l.completed })),
        completedToday: completedDates.some((d) => startOfDay(d).getTime() === startOfDay(new Date()).getTime()),
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

const habitValidators = [body("name").trim().notEmpty().withMessage("Habit name is required.")];

router.post("/", habitValidators, handleValidation, async (req, res, next) => {
  try {
    const { name, frequency, color } = req.body;
    const habit = await prisma.habit.create({
      data: { userId: req.user.id, name, frequency: frequency || "DAILY", color: color || "#5B8FCB" },
    });
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", habitValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Habit not found." });

    const { name, frequency, color } = req.body;
    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: { name, frequency: frequency ?? existing.frequency, color: color ?? existing.color },
    });
    res.json(habit);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Habit not found." });
    await prisma.habit.delete({ where: { id: req.params.id } });
    res.json({ message: "Habit deleted." });
  } catch (err) {
    next(err);
  }
});

// POST /api/habits/:id/toggle - toggles today's (or a given date's) completion
router.post("/:id/toggle", async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!habit) return res.status(404).json({ error: "Habit not found." });

    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date());
    const existingLog = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: habit.id, date } } });

    if (existingLog) {
      await prisma.habitLog.delete({ where: { id: existingLog.id } });
      return res.json({ completed: false, date });
    }

    await prisma.habitLog.create({ data: { habitId: habit.id, userId: req.user.id, date, completed: true } });
    res.json({ completed: true, date });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
